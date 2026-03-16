/*
  COMMAND CENTER — Main dashboard page
  ─────────────────────────────────────
  URL: /
  This is the home page. It fetches generation nodes from Supabase
  and displays them in a summary + table.

  CONCEPTS:
  - This is an async Server Component — the Supabase query runs on the server.
  - The browser receives pre-rendered HTML with data already in it.
  - No "use client", no useEffect, no loading spinner.
*/

import { supabaseServer } from "@/lib/supabase/server";
import { parseEWKBPoint } from "@/lib/geo";
import DashboardMap from "./DashboardMap";
import type { GridNode } from "@/components/GridMap";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  solar:   { icon: "☀",  color: "var(--color-solar)" },
  wind:    { icon: "🌬", color: "var(--color-wind)" },
  hydro:   { icon: "💧", color: "var(--color-hydro)" },
  gas:     { icon: "🔥", color: "var(--color-gas)" },
  battery: { icon: "🔋", color: "var(--color-battery)" },
};

export default async function CommandCenterPage() {
  const { data: nodes, error } = await supabaseServer
    .from("generation_nodes")
    .select("id, name, type, capacity_mw, current_output_mw, status, efficiency_pct, region, location")
    .order("type")
    .order("capacity_mw", { ascending: false });

  if (error || !nodes) {
    return (
      <div className="p-4">
        <p style={{ color: "var(--color-danger)" }} className="text-sm">
          Failed to load grid nodes: {error?.message ?? "Unknown error"}
        </p>
      </div>
    );
  }

  // Parse PostGIS EWKB hex → { lng, lat } for the map
  const mapNodes: GridNode[] = nodes
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

  // ── Summary stats ──
  const totalCapacity = nodes.reduce((sum, n) => sum + Number(n.capacity_mw), 0);
  const byType = nodes.reduce<Record<string, { count: number; mw: number }>>((acc, n) => {
    if (!acc[n.type]) acc[n.type] = { count: 0, mw: 0 };
    acc[n.type].count++;
    acc[n.type].mw += Number(n.capacity_mw);
    return acc;
  }, {});

  return (
    <div className="p-4">
      {/* ── SUMMARY BAR ── */}
      <div
        className="mb-4 grid grid-cols-2 gap-3 rounded-sm p-3 sm:grid-cols-3 md:grid-cols-6"
        style={{ background: "var(--bg-dark)", border: "1px solid var(--border-dark)" }}
      >
        {/* Total */}
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Nodes
          </div>
          <div className="text-lg" style={{ color: "var(--text-on-dark)" }}>
            {nodes.length}
          </div>
        </div>
        {/* Total capacity */}
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Total Capacity
          </div>
          <div className="text-lg" style={{ color: "var(--text-on-dark)" }}>
            {totalCapacity.toLocaleString()}
            <span className="ml-0.5 text-[10px]" style={{ color: "#8a8870" }}>MW</span>
          </div>
        </div>
        {/* Per-type breakdown */}
        {["solar", "wind", "hydro", "gas", "battery"].map((type) => {
          const meta = TYPE_META[type];
          const stats = byType[type] ?? { count: 0, mw: 0 };
          return (
            <div key={type} className="text-center">
              <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {meta.icon} {type}
              </div>
              <div className="text-lg" style={{ color: meta.color }}>
                {stats.count}
                <span className="ml-1 text-[10px]" style={{ color: "#8a8870" }}>
                  {stats.mw.toLocaleString()} MW
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── EMBEDDED MAP ── */}
      <div className="mb-4">
        <div
          className="mb-2 border-b pb-1 text-[10px] font-medium uppercase tracking-widest"
          style={{ color: "var(--text-muted)", borderColor: "var(--border-panel)" }}
        >
          Grid Map
        </div>
        <DashboardMap nodes={mapNodes} />
      </div>

      {/* ── SECTION TITLE ── */}
      <div
        className="mb-2 border-b pb-1 text-[10px] font-medium uppercase tracking-widest"
        style={{ color: "var(--text-muted)", borderColor: "var(--border-panel)" }}
      >
        Generation Nodes
      </div>

      {/* ── NODE TABLE ── */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Type", "Name", "Capacity", "Region", "Status"].map((h) => (
              <th
                key={h}
                className="border-b px-2 py-1 text-left text-[9px] font-normal uppercase tracking-wider"
                style={{ color: "var(--text-muted)", borderColor: "var(--border-panel)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => {
            const meta = TYPE_META[node.type] ?? { icon: "?", color: "#888" };
            return (
              <tr key={node.id}>
                <td
                  className="border-b px-2 py-1.5 text-center text-sm"
                  style={{
                    borderColor: "var(--border-row)",
                    borderLeft: `3px solid ${meta.color}`,
                  }}
                >
                  {meta.icon}
                </td>
                <td
                  className="border-b px-2 py-1.5 text-[11px]"
                  style={{ borderColor: "var(--border-row)", color: "var(--text-secondary)" }}
                >
                  {node.name}
                </td>
                <td
                  className="border-b px-2 py-1.5 text-[11px] font-medium"
                  style={{ borderColor: "var(--border-row)" }}
                >
                  {Number(node.capacity_mw).toLocaleString()} MW
                </td>
                <td
                  className="border-b px-2 py-1.5 text-[11px]"
                  style={{ borderColor: "var(--border-row)", color: "var(--text-muted)" }}
                >
                  {node.region}
                </td>
                <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--border-row)" }}>
                  <span
                    className="rounded-sm px-1.5 py-0.5 text-[9px] font-medium tracking-wider"
                    style={{
                      background: node.status === "online" ? "#d4e8c2" : "#f0d4c4",
                      color: node.status === "online" ? "#3a6010" : "#8a3010",
                    }}
                  >
                    {node.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
