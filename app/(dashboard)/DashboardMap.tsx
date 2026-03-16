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
    <div
      className="overflow-hidden rounded-sm"
      style={{
        height: 320,
        border: "1px solid var(--border-light)",
      }}
    >
      <GridMap nodes={nodes} compact />
    </div>
  );
}
