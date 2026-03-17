/*
  DASHBOARD MAP — Compact embedded map for the home page
  ───────────────────────────────────────────────────────
  Thin Client Component wrapper around <GridMap>.
  The parent Server Component (page.tsx) fetches data and passes it
  as props — this component just renders the map in compact mode.
*/

"use client";

import GridMap, { type GridNode } from "@/components/GridMap";

export default function DashboardMap({ nodes }: { nodes: GridNode[] }) {
  return (
    <div className="h-full w-full overflow-hidden">
      <GridMap nodes={nodes} compact />
    </div>
  );
}
