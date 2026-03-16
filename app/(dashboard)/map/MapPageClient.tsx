/*
  MAP PAGE CLIENT
  ───────────────
  Client Component wrapper for the /map page.
  Holds the GridMap + a slide-in detail panel when a node is clicked.

  WHY SEPARATE FROM page.tsx?
  page.tsx is a Server Component (fetches data from Supabase).
  This file is a Client Component (renders Mapbox GL + manages UI state).
  Data flows: Server → props → Client.
*/

"use client";

import { useState } from "react";
import GridMap, { type GridNode, type TransmissionLine } from "@/components/GridMap";

const TYPE_ICONS: Record<string, string> = {
  solar: "☀",
  wind: "🌬",
  hydro: "💧",
  gas: "🔥",
  battery: "🔋",
};

const TYPE_COLORS: Record<string, string> = {
  solar: "var(--color-solar)",
  wind: "var(--color-wind)",
  hydro: "var(--color-hydro)",
  gas: "var(--color-gas)",
  battery: "var(--color-battery)",
};

export default function MapPageClient({ nodes, lines = [] }: { nodes: GridNode[]; lines?: TransmissionLine[] }) {
  const [selectedNode, setSelectedNode] = useState<GridNode | null>(null);

  return (
    <div className="relative flex h-full" style={{ background: "var(--bg-panel)" }}>
      {/* Map fills all available space */}
      <div className="flex-1">
        <GridMap nodes={nodes} lines={lines} onNodeClick={setSelectedNode} />
      </div>

      {/* Node Detail Panel — slides in from right */}
      {selectedNode && (
        <div
          className="w-[260px] flex-shrink-0 overflow-y-auto border-l p-3"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border-light)",
          }}
        >
          {/* Close button */}
          <div className="mb-2 flex items-center justify-between">
            <span
              className="text-[9px] font-medium uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Node Detail
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="cursor-pointer text-sm leading-none"
              style={{ color: "var(--text-muted)" }}
            >
              ✕
            </button>
          </div>

          {/* Type badge + name */}
          <div className="mb-3 flex items-start gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-sm text-lg"
              style={{ background: "var(--bg-panel)", border: `2px solid ${TYPE_COLORS[selectedNode.type] ?? "#888"}` }}
            >
              {TYPE_ICONS[selectedNode.type] ?? "?"}
            </span>
            <div>
              <div className="text-[13px] font-medium leading-tight" style={{ color: "var(--text-primary)" }}>
                {selectedNode.name}
              </div>
              <div className="text-[10px] capitalize" style={{ color: TYPE_COLORS[selectedNode.type] ?? "#888" }}>
                {selectedNode.type}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div
            className="mb-3 border-b pb-2"
            style={{ borderColor: "var(--border-panel)" }}
          >
            <StatRow label="Capacity" value={`${selectedNode.capacity_mw.toLocaleString()} MW`} />
            <StatRow label="Current Output" value={`${selectedNode.current_output_mw.toLocaleString()} MW`} />
            <StatRow label="Efficiency" value={`${selectedNode.efficiency_pct}%`} />
            <StatRow label="Region" value={selectedNode.region} />
            <StatRow
              label="Status"
              value={
                <span
                  className="rounded-sm px-1.5 py-0.5 text-[9px] font-medium tracking-wider"
                  style={{
                    background: selectedNode.status === "online" ? "#d4e8c2" : "#f0d4c4",
                    color: selectedNode.status === "online" ? "#3a6010" : "#8a3010",
                  }}
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              }
            />
          </div>

          {/* Coordinates */}
          <div className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
          {Math.abs(selectedNode.lat).toFixed(4)}°{selectedNode.lat >= 0 ? "N" : "S"},{" "}
            {Math.abs(selectedNode.lng).toFixed(4)}°{selectedNode.lng >= 0 ? "E" : "W"}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
