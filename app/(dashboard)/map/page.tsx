/*
  OPS MAP — Full-screen Mapbox view
  ──────────────────────────────────
  URL: /map
  Reads nodes from the Zustand store (hydrated by RealtimeProvider).
  Supabase server fetch path preserved in comments for later wiring.
*/

"use client";

import { useGridStore } from "@/lib/store";
import MapPageClient from "./MapPageClient";
import type { GridNode } from "@/components/GridMap";

/*
  SUPABASE SERVER PATH (kept for compatibility)
  ---------------------------------------------
  import { supabaseServer } from "@/lib/supabase/server";
  import { parseEWKBPoint } from "@/lib/geo";
  import type { TransmissionLine } from "@/components/GridMap";

  export default async function MapPage() {
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

    const nodes: GridNode[] = nodesResult.data
      .map((row) => {
        const coords = parseEWKBPoint(row.location as string);
        if (!coords) return null;
        return { ...row, lng: coords.lng, lat: coords.lat } as GridNode;
      })
      .filter((n): n is GridNode => n !== null);

    const lines: TransmissionLine[] = (linesResult.data ?? [])
      .map((row) => {
        const fromCoords = parseEWKBPoint(row.from_coords as string);
        const toCoords = parseEWKBPoint(row.to_coords as string);
        if (!fromCoords || !toCoords) return null;
        return { ...row, from_lng: fromCoords.lng, from_lat: fromCoords.lat,
                 to_lng: toCoords.lng, to_lat: toCoords.lat } as TransmissionLine;
      })
      .filter((l): l is TransmissionLine => l !== null);

    return <MapPageClient nodes={nodes} lines={lines} />;
  }
*/

export default function MapPage() {
  const storeNodes = useGridStore((s) => s.nodes);

  const nodes: GridNode[] = storeNodes.map((n) => ({
    id: n.id,
    name: n.name,
    type: n.type,
    capacity_mw: Number(n.capacity_mw),
    current_output_mw: Number(n.current_output_mw),
    status: n.status,
    efficiency_pct: Number(n.efficiency_pct),
    region: n.region,
    lng: Number(n.lng),
    lat: Number(n.lat),
  }));

  // Transmission lines will come from the store in a future iteration
  return <MapPageClient nodes={nodes} lines={[]} />;
}
