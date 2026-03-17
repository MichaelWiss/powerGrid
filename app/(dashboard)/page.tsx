/*
  COMMAND CENTER — Main dashboard page
  ─────────────────────────────────────
  URL: /
  Reads from the Zustand store (hydrated by RealtimeProvider).
  Supabase server fetch path preserved in comments for compatibility.
*/

"use client";

import DashboardMap from "./DashboardMap";
import type { GridNode } from "@/components/GridMap";
import { useGridStore } from "@/lib/store";

/*
  SUPABASE SERVER PATH (kept for compatibility)
  import { supabaseServer } from "@/lib/supabase/server";
  import { parseEWKBPoint } from "@/lib/geo";
*/

// ── Helpers ──────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: string; color: string; barColor: string }> = {
  solar:   { icon: "☀",  color: "var(--color-solar)",   barColor: "#e8a020" },
  wind:    { icon: "🌬", color: "var(--color-wind)",    barColor: "#3a8ad4" },
  hydro:   { icon: "💧", color: "var(--color-hydro)",   barColor: "#3aada0" },
  battery: { icon: "🔋", color: "var(--color-battery)", barColor: "#5a7ad4" },
  gas:     { icon: "🔥", color: "var(--color-gas)",     barColor: "#c05030" },
};

const SEVERITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: "#e84a2a", color: "#fff", label: "▲" },
  warning:  { bg: "#e89a20", color: "#fff", label: "▲" },
  info:     { bg: "#3a7ad4", color: "#fff", label: "i" },
};

// Static battery data (will come from Supabase battery_storage table later)
const BATTERIES = [
  { region: "Nevada", soc: 75, capacity: 200, dispatch: 15, revenue: 2130 },
  { region: "Texas", soc: 40, capacity: 150, dispatch: -8, revenue: -456 },
  { region: "New York", soc: 62, capacity: 180, dispatch: 5, revenue: 710 },
];

export default function CommandCenterPage() {
  const nodes = useGridStore((s) => s.nodes);
  const snapshot = useGridStore((s) => s.latestSnapshot);
  const alerts = useGridStore((s) => s.alerts);

  const mapNodes: GridNode[] = nodes.map((n) => ({
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

  // Max GW for generation bar scaling
  const maxGw = snapshot
    ? Math.max(snapshot.solar_gw, snapshot.wind_gw, snapshot.hydro_gw, snapshot.battery_gw, snapshot.gas_gw, 1)
    : 1;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── KPI BAR ── */}
      {snapshot && (
        <div
          className="grid grid-cols-5"
          style={{ background: "#1a1a0e", borderBottom: "1px solid #3a3a20" }}
        >
          <KpiCell label="Total Demand" value={snapshot.total_demand_gw} unit="GW" />
          <KpiCell label="Renewable Gen" value={snapshot.renewable_gen_gw} unit="GW" />
          <KpiCell
            label="Grid Balance"
            value={snapshot.grid_balance_gw}
            unit="GW"
            prefix="+"
            valueColor="#7ab850"
          />
          <KpiCell
            label="Curtailment"
            value={snapshot.curtailment_gw}
            unit="GW"
            valueColor="#e89a20"
            subtitle="Wasted renewable"
          />
          <KpiCell
            label="CO₂ Intensity"
            value={snapshot.co2_intensity}
            unit="g/kWh"
            valueColor="#7ab850"
            delta="↓ 18% vs avg"
          />
        </div>
      )}

      {/* ── 3-COLUMN BODY ── */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT PANEL — Generation + Grid Health + Interconnect */}
        <div
          className="w-[168px] flex-shrink-0 overflow-y-auto p-2.5"
          style={{ borderRight: "1px solid #ccc8b4" }}
        >
          <PanelTitle>Generation</PanelTitle>
          {snapshot &&
            (["solar", "wind", "hydro", "battery", "gas"] as const).map((type) => {
              const meta = TYPE_META[type];
              const gw = snapshot[`${type}_gw` as keyof typeof snapshot] as number;
              const pct = (gw / maxGw) * 100;
              return (
                <div key={type} className="mb-[7px] flex items-center gap-1.5">
                  <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center text-[13px]">
                    {meta.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: "#4a4838" }}>
                        {type === "gas" ? "Gas (peak)" : type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                      <span className="w-[46px] text-right text-[12px] font-medium" style={{ color: "#2a2820" }}>
                        {gw.toFixed(1)} GW
                      </span>
                    </div>
                    <div className="mt-0.5 h-[3px] w-full rounded-sm" style={{ background: "#ddd9c8" }}>
                      <div className="h-[3px] rounded-sm" style={{ width: `${pct}%`, background: meta.barColor }} />
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Grid Health */}
          {snapshot && (
            <>
              <PanelTitle className="mt-2.5">Grid Health</PanelTitle>
              <StatRow label="Frequency">
                <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>
                  {snapshot.frequency_hz.toFixed(2)}
                </span>
                <span className="text-[10px]" style={{ color: "#7a7860" }}>
                  {" "}Hz
                </span>
                <Badge color="green">STABLE</Badge>
              </StatRow>
              <StatRow label="Inertia">
                <span className="text-[12px] font-medium" style={{ color: "#c07820" }}>↓ MED</span>
              </StatRow>
              <div className="mb-0.5 h-1 w-full rounded-sm" style={{ background: "#e0dcc8" }}>
                <div
                  className="h-1 rounded-sm"
                  style={{
                    width: `${snapshot.synthetic_inertia_pct}%`,
                    background: "linear-gradient(90deg, #e8a020, #5a9a20)",
                  }}
                />
              </div>
              <div className="mb-1.5 text-[9px]" style={{ color: "#9a9880" }}>
                Synthetic inertia at {snapshot.synthetic_inertia_pct}%
              </div>
              <StatRow label="Reserve">
                <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>
                  +{snapshot.reserve_margin_gw.toFixed(1)} GW
                </span>
              </StatRow>
              <StatRow label="Voltage">
                <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>
                  {(snapshot.voltage_pu * 100).toFixed(1)}%
                </span>
              </StatRow>
              <StatRow label="Ramp rate">
                <span className="text-[12px] font-medium" style={{ color: "#c07820" }}>
                  +{snapshot.ramp_rate_mw_min} MW/min
                </span>
              </StatRow>
              <StatRow label="TX Load">
                <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>73%</span>
              </StatRow>
              <div className="mb-0.5 h-[3px] w-full rounded-sm" style={{ background: "#ddd9c8" }}>
                <div className="h-[3px] rounded-sm" style={{ width: "73%", background: "#c07820" }} />
              </div>
            </>
          )}

          {/* Interconnect Flow */}
          <PanelTitle className="mt-2.5">Interconnect Flow</PanelTitle>
          <StatRow label="West→East">
            <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>+3.2 GW</span>
          </StatRow>
          <StatRow label="ERCOT">
            <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>Isolated</span>
            <Badge color="amber">ISO</Badge>
          </StatRow>
          <StatRow label="Canada">
            <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>+0.8 GW</span>
          </StatRow>
        </div>

        {/* CENTER — Map + Battery Table */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <DashboardMap nodes={mapNodes} />
          </div>

          {/* Battery Storage Table */}
          <div className="px-3 py-2" style={{ background: "#ede9d8", borderTop: "1px solid #ccc8b4" }}>
            <div
              className="mb-1.5 text-[9px] font-medium uppercase tracking-widest"
              style={{ color: "#7a7860" }}
            >
              Battery Storage
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Region", "Charge", "SoC", "Capacity", "Dispatch", "Revenue"].map((h) => (
                    <th
                      key={h}
                      className="border-b px-1 py-0.5 text-left text-[9px] font-normal uppercase tracking-wider"
                      style={{ color: "#7a7860", borderColor: "#d5d1be" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BATTERIES.map((b) => (
                  <tr key={b.region}>
                    <td className="border-b px-1 py-1 text-[11px]" style={{ color: "#3a3828", borderColor: "#eae6d4" }}>
                      {b.region}
                    </td>
                    <td className="border-b px-1 py-1" style={{ borderColor: "#eae6d4" }}>
                      <span
                        className="inline-block h-2 overflow-hidden rounded-sm"
                        style={{ width: 64, background: "#e0dcc8" }}
                      >
                        <span
                          className="block h-full rounded-sm"
                          style={{
                            width: `${b.soc}%`,
                            background: b.soc > 60 ? "#3a8840" : b.soc > 30 ? "#d06020" : "#c03820",
                          }}
                        />
                      </span>
                    </td>
                    <td className="border-b px-1 py-1 text-[11px]" style={{ color: "#3a3828", borderColor: "#eae6d4" }}>
                      {b.soc}%
                    </td>
                    <td className="border-b px-1 py-1 text-[11px]" style={{ color: "#3a3828", borderColor: "#eae6d4" }}>
                      {b.capacity} MWh
                    </td>
                    <td
                      className="border-b px-1 py-1 text-[11px] font-medium"
                      style={{ color: b.dispatch >= 0 ? "#3a7820" : "#c03820", borderColor: "#eae6d4" }}
                    >
                      {b.dispatch >= 0 ? "+" : "−"}{Math.abs(b.dispatch)} MW
                    </td>
                    <td
                      className="border-b px-1 py-1 text-[10px]"
                      style={{ color: b.revenue >= 0 ? "#3a6010" : "#c03820", borderColor: "#eae6d4" }}
                    >
                      {b.revenue >= 0 ? "" : "−"}${Math.abs(b.revenue).toLocaleString()}/h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL — Alerts, Market, Forecast, Scenarios, Asset Health */}
        <div
          className="w-[178px] flex-shrink-0 overflow-y-auto p-2.5"
          style={{ borderLeft: "1px solid #ccc8b4" }}
        >
          <PanelTitle>Alerts</PanelTitle>
          {alerts.length === 0 && (
            <div className="text-[11px]" style={{ color: "#9a9880" }}>No alerts</div>
          )}
          {alerts.map((alert) => {
            const sev = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info;
            const time = alert.created_at
              ? new Date(alert.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
              : "";
            return (
              <div
                key={alert.id}
                className="mb-2 flex items-start gap-1.5 border-b pb-2"
                style={{ borderColor: "#e0dcc8" }}
              >
                <span
                  className="mt-0.5 flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center rounded-sm text-[9px]"
                  style={{ background: sev.bg, color: sev.color }}
                >
                  {sev.label}
                </span>
                <span className="flex-1 text-[11px] leading-snug" style={{ color: "#3a3828" }}>
                  {alert.message}
                </span>
                {time && (
                  <span className="flex-shrink-0 text-[10px]" style={{ color: "#9a9880" }}>
                    {time}
                  </span>
                )}
              </div>
            );
          })}

          {/* Market Price */}
          {snapshot && (
            <>
              <PanelTitle className="mt-2">Market Price</PanelTitle>
              <div className="mb-1 flex items-baseline gap-1.5">
                <span className="text-[22px] font-normal" style={{ color: "#2a2820" }}>
                  ${snapshot.market_price_mwh.toFixed(0)}
                </span>
                <span className="text-[11px]" style={{ color: "#7a7860" }}>/MWh</span>
                <span className="text-[12px]" style={{ color: "#d06020" }}>↑ 8.3%</span>
              </div>
              <div className="mb-1 text-[10px]" style={{ color: "#7a7860" }}>
                Carbon credit: $48/t · Curtailment cost: $1.4M today
              </div>
            </>
          )}

          {/* Demand Forecast */}
          <PanelTitle className="mt-2.5">Demand Forecast — 24h</PanelTitle>
          <div className="mb-1 text-[10px]" style={{ color: "#c04828" }}>
            Peak: 88.3 GW at ~18:30 EST
          </div>
          <div
            className="mb-2 flex h-[60px] items-end gap-[3px] rounded-sm p-1"
            style={{ background: "#ede9d8" }}
          >
            {[82, 78, 75, 88, 76].map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${((v - 60) / 30) * 100}%`,
                  background: v > 85 ? "#c04828" : "#3a6898",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>

          {/* Scenario Engine */}
          <PanelTitle className="mt-2.5">Scenario Engine</PanelTitle>
          <div className="mb-1.5 text-[10px]" style={{ color: "#6a6854" }}>
            Simulate what-if events
          </div>
          <div className="flex flex-wrap gap-1">
            {["Cascade failure", "Cloud front", "Demand spike", "Battery optimize"].map((s) => (
              <span
                key={s}
                className="cursor-pointer rounded-sm px-2 py-0.5 text-[10px] transition-colors hover:bg-[#ddd9c8]"
                style={{ border: "1px solid #b0ac98", color: "#5a5848", background: "#ede9d8" }}
              >
                {s} ↗
              </span>
            ))}
          </div>

          {/* Asset Health */}
          <PanelTitle className="mt-2.5">Asset Health</PanelTitle>
          <StatRow label="Underperforming">
            <span className="text-[12px] font-medium" style={{ color: "#c04828" }}>4 assets</span>
          </StatRow>
          <StatRow label="Maintenance queue">
            <span className="text-[12px] font-medium" style={{ color: "#2a2820" }}>7 scheduled</span>
          </StatRow>
          <div className="text-[10px]" style={{ color: "#7a7860" }}>
            TX Wind Farm B: −22% vs expected
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function PanelTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`mb-2 border-b pb-[5px] text-[10px] font-medium uppercase tracking-widest ${className}`}
      style={{ color: "#7a7860", borderColor: "#d5d1be" }}
    >
      {children}
    </div>
  );
}

function KpiCell({
  label,
  value,
  unit,
  prefix = "",
  valueColor,
  subtitle,
  delta,
}: {
  label: string;
  value: number;
  unit: string;
  prefix?: string;
  valueColor?: string;
  subtitle?: string;
  delta?: string;
}) {
  return (
    <div className="px-2.5 py-[7px] text-center" style={{ borderRight: "1px solid #2e2e1a" }}>
      <div className="mb-0.5 text-[9px] uppercase tracking-widest" style={{ color: "#7a7860" }}>
        {label}
      </div>
      <div>
        <span className="text-[18px] leading-none" style={{ color: valueColor ?? "#e8e4d4" }}>
          {prefix}
          {value}
        </span>
        <span className="ml-0.5 text-[10px]" style={{ color: "#8a8870" }}>
          {unit}
        </span>
      </div>
      {subtitle && (
        <div className="mt-0.5 text-[9px]" style={{ color: "#8a8870" }}>
          {subtitle}
        </div>
      )}
      {delta && (
        <div className="text-[10px]" style={{ color: "#7ab850" }}>
          {delta}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[7px] flex items-center justify-between">
      <span className="text-[10px]" style={{ color: "#6a6854" }}>
        {label}
      </span>
      <span className="flex items-center gap-1">{children}</span>
    </div>
  );
}

function Badge({ color, children }: { color: "green" | "amber" | "red"; children: React.ReactNode }) {
  const styles = {
    green: { background: "#d4e8c2", color: "#3a6010" },
    amber: { background: "#f0e4c4", color: "#7a5010" },
    red:   { background: "#f0d4c4", color: "#8a3010" },
  };
  return (
    <span
      className="ml-1 rounded-sm px-1.5 py-0.5 text-[9px] font-medium tracking-wider"
      style={styles[color]}
    >
      {children}
    </span>
  );
}
