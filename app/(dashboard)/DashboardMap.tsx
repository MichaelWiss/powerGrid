/*
  DASHBOARD MAP — Compact embedded map for the home page
  ───────────────────────────────────────────────────────
  Thin Client Component wrapper around <GridMap>.
  The parent Server Component (page.tsx) fetches data and passes it
  as props — this component just renders the map in compact mode.
*/

"use client";

import { useState } from "react";
import GridMap, { type GridNode } from "@/components/GridMap";
import { TYPE_COLORS, TYPE_ICONS } from "@/lib/gridTypes";

function getTypeColor(type: string): string {
  return TYPE_COLORS[type as keyof typeof TYPE_COLORS] ?? "#888";
}

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? "?";
}

export default function DashboardMap({ nodes }: { nodes: GridNode[] }) {
  const [selected, setSelected] = useState<GridNode | null>(null);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GridMap nodes={nodes} compact onNodeClick={setSelected} />

      {/* Node detail card — floating overlay */}
      {selected && (
        <div
          className="absolute right-2 top-2 z-10 w-[200px] rounded-sm p-2.5 shadow-md"
          style={{ background: "rgba(237,233,216,0.96)", border: "1px solid #ccc8b4" }}
        >
          <div className="mb-1.5 flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-sm text-sm"
                style={{ border: `2px solid ${getTypeColor(selected.type)}` }}
              >
                {getTypeIcon(selected.type)}
              </span>
              <div>
                <div className="text-[11px] font-medium leading-tight" style={{ color: "#2a2820" }}>
                  {selected.name}
                </div>
                <div className="text-[9px] capitalize" style={{ color: getTypeColor(selected.type) }}>
                  {selected.type}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="cursor-pointer text-[11px] leading-none"
              style={{ color: "#7a7860" }}
            >
              ✕
            </button>
          </div>

          <div className="space-y-[5px]">
            <DetailRow label="Capacity" value={`${selected.capacity_mw.toLocaleString()} MW`} />
            <DetailRow label="Output" value={`${selected.current_output_mw.toLocaleString()} MW`} />
            <DetailRow
              label="Utilization"
              value={`${selected.capacity_mw > 0 ? Math.round((selected.current_output_mw / selected.capacity_mw) * 100) : 0}%`}
            />
            <DetailRow label="Efficiency" value={`${selected.efficiency_pct}%`} />
            <DetailRow label="Region" value={selected.region} />
            <DetailRow
              label="Status"
              value={
                <span
                  className="rounded-sm px-1 py-[1px] text-[8px] font-medium tracking-wider"
                  style={{
                    background: selected.status === "online" ? "#d4e8c2" : selected.status === "maintenance" ? "#f0e4c4" : "#f0d4c4",
                    color: selected.status === "online" ? "#3a6010" : selected.status === "maintenance" ? "#7a5010" : "#8a3010",
                  }}
                >
                  {selected.status.toUpperCase()}
                </span>
              }
            />
          </div>

          <div className="mt-1.5 text-[9px]" style={{ color: "#9a9880" }}>
            {Math.abs(selected.lat).toFixed(4)}°{selected.lat >= 0 ? "N" : "S"},{" "}
            {Math.abs(selected.lng).toFixed(4)}°{selected.lng >= 0 ? "E" : "W"}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px]" style={{ color: "#7a7860" }}>{label}</span>
      <span className="text-[10px] font-medium" style={{ color: "#2a2820" }}>{value}</span>
    </div>
  );
}
