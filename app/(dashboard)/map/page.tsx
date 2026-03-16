/*
  OPS MAP — Full-screen Mapbox view
  ──────────────────────────────────
  URL: /map

  ARCHITECTURE:
  - This PAGE is a Server Component — it fetches data from Supabase.
  - It passes the data to <MapPageClient>, which is a Client Component
    because Mapbox GL needs browser APIs.
  - This pattern (Server fetches → Client renders) avoids shipping
    the Supabase SDK to the browser.
*/

import { supabaseServer } from "@/lib/supabase/server";
import { parseEWKBPoint } from "@/lib/geo";
import MapPageClient from "./MapPageClient";
import type { GridNode, TransmissionLine } from "@/components/GridMap";

export default async function MapPage() {
  // Fetch nodes and lines in parallel
  const [nodesResult, linesResult] = await Promise.all([
    supabaseServer
      .from("generation_nodes")
      .select("id, name, type, capacity_mw, current_output_mw, status, efficiency_pct, region, location")
      .order("type")
      .order("capacity_mw", { ascending: false }),
    supabaseServer
      .from("transmission_lines")
      .select("id, name, from_node_id, to_node_id, capacity_mw, current_load_mw, status, from_coords, to_coords"),
  ]);

  if (nodesResult.error || !nodesResult.data) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "var(--bg-panel)" }}>
        <p style={{ color: "var(--color-danger)" }} className="text-sm">
          Failed to load nodes: {nodesResult.error?.message ?? "Unknown error"}
        </p>
      </div>
    );
  }

  // Parse PostGIS EWKB hex → { lng, lat }
  const nodes: GridNode[] = nodesResult.data
    .map((row) => {
      const coords = parseEWKBPoint(row.location as string);
      if (!coords) return null;
      return {
        id: row.id,
        name: row.name,
        type: row.type,
        capacity_mw: Number(row.capacity_mw),
        current_output_mw: Number(row.current_output_mw),
        status: row.status,
        efficiency_pct: Number(row.efficiency_pct),
        region: row.region,
        lng: coords.lng,
        lat: coords.lat,
      };
    })
    .filter((n): n is GridNode => n !== null);

  // Parse transmission line coordinates
  const lines: TransmissionLine[] = (linesResult.data ?? [])
    .map((row) => {
      const fromCoords = parseEWKBPoint(row.from_coords as string);
      const toCoords = parseEWKBPoint(row.to_coords as string);
      if (!fromCoords || !toCoords) return null;
      return {
        id: row.id,
        name: row.name,
        from_node_id: row.from_node_id,
        to_node_id: row.to_node_id,
        capacity_mw: Number(row.capacity_mw),
        current_load_mw: Number(row.current_load_mw),
        status: row.status,
        from_lng: fromCoords.lng,
        from_lat: fromCoords.lat,
        to_lng: toCoords.lng,
        to_lat: toCoords.lat,
      };
    })
    .filter((l): l is TransmissionLine => l !== null);

  return <MapPageClient nodes={nodes} lines={lines} />;
}
