/*
  GRID MAP — Mapbox GL Client Component
  ──────────────────────────────────────
  Renders an interactive map of US generation nodes.
  Used in two places:
    /map      → full-screen (compact=false)
    /         → embedded in dashboard (compact=true)

  CONCEPTS:
  - "use client" because Mapbox GL needs browser APIs (DOM, window)
  - useRef to hold the map instance (persists across re-renders)
  - useEffect for setup/teardown lifecycle
  - Data-driven styling: Mapbox colors markers by their `type` property
  - GeoJSON: the universal language between Postgres → React → Mapbox
*/

"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { TYPE_COLORS, TYPE_ICONS } from "@/lib/gridTypes";

// ── Types ────────────────────────────────────────────────────────
export interface GridNode {
  id: string;
  name: string;
  type: string;
  capacity_mw: number;
  current_output_mw: number;
  status: string;
  efficiency_pct: number;
  region: string;
  lng: number;
  lat: number;
}

export interface TransmissionLine {
  id: string;
  name: string;
  from_node_id: string;
  to_node_id: string;
  capacity_mw: number;
  current_load_mw: number;
  status: string;
  from_lng: number;
  from_lat: number;
  to_lng: number;
  to_lat: number;
}

interface GridMapProps {
  nodes: GridNode[];
  lines?: TransmissionLine[];
  compact?: boolean;
  onNodeClick?: (node: GridNode) => void;
}

// ── Constants ────────────────────────────────────────────────────

// US center for initial view
const US_CENTER: [number, number] = [-98.5, 39.5];
const US_ZOOM_FULL = 3.8;
const US_ZOOM_COMPACT = 3.2;

// ── Helpers ──────────────────────────────────────────────────────

function nodesToGeoJSON(nodes: GridNode[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: nodes.map((n) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [n.lng, n.lat] },
      properties: {
        id: n.id,
        name: n.name,
        type: n.type,
        capacity_mw: n.capacity_mw,
        current_output_mw: n.current_output_mw,
        status: n.status,
        efficiency_pct: n.efficiency_pct,
        region: n.region,
      },
    })),
  };
}

function linesToGeoJSON(lines: TransmissionLine[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: lines.map((l) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [l.from_lng, l.from_lat],
          [l.to_lng, l.to_lat],
        ],
      },
      properties: {
        id: l.id,
        name: l.name,
        status: l.status,
        capacity_mw: l.capacity_mw,
        current_load_mw: l.current_load_mw,
      },
    })),
  };
}

// ── Component ────────────────────────────────────────────────────

export default function GridMap({ nodes, lines = [], compact = false, onNodeClick }: GridMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapLoaded = useRef(false);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      // Light style with muted tones — closest to the reference's earthy palette
      style: "mapbox://styles/mapbox/light-v11",
      center: US_CENTER,
      zoom: compact ? US_ZOOM_COMPACT : US_ZOOM_FULL,
      minZoom: 2,
      maxZoom: 12,
      attributionControl: !compact,
    });

    mapRef.current = map;

    // Add controls (full-screen only)
    if (!compact) {
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
    }

    map.on("load", () => {
      mapLoaded.current = true;

      // ── Transmission lines layer ──────────────────────────────
      // Source is always created (even with empty data) so the reactive
      // update effect below can call setData() when lines arrive later.
      map.addSource("transmission-lines", {
        type: "geojson",
        data: linesToGeoJSON(lines),
      });

      if (lines.length > 0) {
        map.addLayer({
          id: "transmission-lines-layer",
          type: "line",
          source: "transmission-lines",
          paint: {
            "line-color": [
              "match",
              ["get", "status"],
              "congested", "#e89a20",
              "critical", "#e84a2a",
              "offline",  "#888888",
              "#c08020", // normal — amber from reference
            ],
            "line-width": [
              "match",
              ["get", "status"],
              "critical", 2.5,
              "congested", 2,
              1.5,
            ],
            "line-dasharray": [6, 4],
            "line-opacity": 0.7,
          },
        });
      }

      // ── Node markers layer (clustered) ───────────────────────
      // Read from nodesRef so we always get the latest data,
      // even if the store hydrated before the map finished loading.
      map.addSource("grid-nodes", {
        type: "geojson",
        data: nodesToGeoJSON(nodesRef.current),
        cluster: true,
        clusterMaxZoom: 9,
        clusterRadius: 50,
        clusterProperties: {
          // Sum capacity for cluster display
          totalCapacity: ["+", ["get", "capacity_mw"]],
        },
      });

      // ── Cluster circles ────────────────────────────────────
      map.addLayer({
        id: "cluster-circles",
        type: "circle",
        source: "grid-nodes",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "step", ["get", "point_count"],
            16, 20, 22, 100, 28, 500, 34,
          ],
          "circle-color": [
            "step", ["get", "point_count"],
            "#5a9a50", 20, "#3a8ad4", 100, "#e8a020", 500, "#c05030",
          ],
          "circle-opacity": 0.75,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-stroke-opacity": 0.5,
        },
      });

      // Cluster count label
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "grid-nodes",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#fff",
        },
      });

      // ── Unclustered: glow ring ──────────────────────────────
      map.addLayer({
        id: "node-glow",
        type: "circle",
        source: "grid-nodes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "capacity_mw"],
            10, 8, 200, 12, 1500, 18, 7000, 24,
          ],
          "circle-color": [
            "match",
            ["get", "type"],
            "solar",   TYPE_COLORS.solar,
            "wind",    TYPE_COLORS.wind,
            "hydro",   TYPE_COLORS.hydro,
            "gas",     TYPE_COLORS.gas,
            "battery", TYPE_COLORS.battery,
            "#888",
          ],
          "circle-opacity": 0.15,
          "circle-stroke-width": 0,
        },
      });

      // ── Unclustered: main circle marker ───────────────────
      map.addLayer({
        id: "node-markers",
        type: "circle",
        source: "grid-nodes",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "capacity_mw"],
            10, 3, 200, 5, 1500, 8, 7000, 12,
          ],
          "circle-color": [
            "match",
            ["get", "type"],
            "solar",   TYPE_COLORS.solar,
            "wind",    TYPE_COLORS.wind,
            "hydro",   TYPE_COLORS.hydro,
            "gas",     TYPE_COLORS.gas,
            "battery", TYPE_COLORS.battery,
            "#888",
          ],
          "circle-stroke-color": "#1a1a0e",
          "circle-stroke-width": 1,
          "circle-opacity": [
            "match",
            ["get", "status"],
            "offline", 0.4,
            "maintenance", 0.6,
            1,
          ],
        },
      });

      // Node labels (full-screen only, high zoom)
      if (!compact) {
        map.addLayer({
          id: "node-labels",
          type: "symbol",
          source: "grid-nodes",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["get", "name"],
            "text-size": 10,
            "text-offset": [0, 1.5],
            "text-anchor": "top",
            "text-max-width": 12,
            "text-font": ["DIN Pro Regular", "Arial Unicode MS Regular"],
          },
          paint: {
            "text-color": "#3a3828",
            "text-halo-color": "#f5f2ea",
            "text-halo-width": 1.5,
          },
          minzoom: 7,
        });
      }

      // ── Interactions ────────────────────────────────────

      // Click cluster → zoom in
      map.on("click", "cluster-circles", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["cluster-circles"] });
        if (!features.length) return;
        const clusterId = features[0].properties!.cluster_id;
        (map.getSource("grid-nodes") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const geom = features[0].geometry as GeoJSON.Point;
          map.easeTo({ center: geom.coordinates as [number, number], zoom: zoom! });
        });
      });

      // Cursor on clusters
      map.on("mouseenter", "cluster-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cluster-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      // Cursor on individual markers
      map.on("mouseenter", "node-markers", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "node-markers", () => {
        map.getCanvas().style.cursor = "";
        setHoveredNode(null);
      });

      // Hover tooltip
      map.on("mousemove", "node-markers", (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties!;
          setHoveredNode(props.name);
        }
      });

      // Click node → callback
      map.on("click", "node-markers", (e) => {
        if (e.features && e.features[0] && onNodeClick) {
          const props = e.features[0].properties!;
          const geom = e.features[0].geometry as GeoJSON.Point;
          onNodeClick({
            id: props.id,
            name: props.name,
            type: props.type,
            capacity_mw: props.capacity_mw,
            current_output_mw: props.current_output_mw,
            status: props.status,
            efficiency_pct: props.efficiency_pct,
            region: props.region,
            lng: geom.coordinates[0],
            lat: geom.coordinates[1],
          });
        }
      });
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Surgical update: push new node data into the existing map source ──
  // This runs whenever the `nodes` prop changes (e.g. store hydration,
  // Realtime UPDATE). Mapbox diffs internally and only repaints changed
  // markers — the map stays smooth at 60fps.
  // If the map hasn't loaded yet, nodesRef ensures the load handler
  // picks up the latest data automatically.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded.current) return;
    const source = map.getSource("grid-nodes") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(nodesToGeoJSON(nodes));
    }
  }, [nodes]);

  // Keep transmission lines in sync when data updates without remounting.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded.current) return;
    const source = map.getSource("transmission-lines") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(linesToGeoJSON(lines));
    }
  }, [lines]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: compact ? 300 : "100%" }}>
      <div ref={mapContainer} className="h-full w-full" />

      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="pointer-events-none absolute left-3 top-3 rounded-sm px-2 py-1 text-[11px]"
          style={{
            background: "var(--bg-dark)",
            color: "var(--text-on-dark)",
            border: "1px solid var(--border-dark)",
          }}
        >
          {hoveredNode}
        </div>
      )}

      {/* Legend (full-screen only) */}
      {!compact && (
        <div
          className="absolute bottom-6 left-3 rounded-sm p-2.5"
          style={{
            background: "rgba(237,233,216,0.92)",
            border: "1px solid var(--border-light)",
          }}
        >
          <div
            className="mb-1.5 text-[9px] font-medium uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Legend
          </div>
          {(["solar", "wind", "hydro", "gas", "battery"] as const).map((type) => (
            <div key={type} className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: TYPE_COLORS[type], border: "1px solid #1a1a0e" }}
              />
              <span className="text-[10px] capitalize" style={{ color: "var(--text-secondary)" }}>
                {TYPE_ICONS[type]} {type}
              </span>
            </div>
          ))}
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="inline-block h-0 w-4"
              style={{ borderTop: "2px dashed #c08020" }}
            />
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
              Transmission
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
