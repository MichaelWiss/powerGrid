"use client";

/*
  DEMO PAGE — Static recreation of the Grid Command Center mockup
  ────────────────────────────────────────────────────────────────
  URL: /demo

  This is a self-contained page that recreates the HTML mockup
  using React components and the design tokens from globals.css.
  All data is hardcoded — no API calls, no database.

  PURPOSE: See what the finished product will look like.
  As we build real features, each section here will be replaced
  by live components backed by real data.
*/

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

// ═══════════════════════════════════════════════════════════════
// STATIC DATA — all hardcoded from the mockup
// ═══════════════════════════════════════════════════════════════

const GENERATION = [
  { type: "Solar",      icon: "☀",  value: 34.2, pct: 72, color: "var(--color-solar)" },
  { type: "Wind",       icon: "🌬", value: 28.1, pct: 59, color: "var(--color-wind)" },
  { type: "Hydro",      icon: "💧", value: 7.4,  pct: 28, color: "var(--color-hydro)" },
  { type: "Battery",    icon: "🔋", value: 6.8,  pct: 23, color: "var(--color-battery)" },
  { type: "Gas (peak)", icon: "🔥", value: 5.9,  pct: 16, color: "var(--color-gas)" },
];

const ALERTS = [
  { severity: "critical", text: "Solar outage — AZ node offline", time: "12:59" },
  { severity: "warning",  text: "Congestion: Atlanta–Dallas line at 94%", time: "17:40" },
  { severity: "warning",  text: "Low inertia warning — WECC region", time: "18:05" },
  { severity: "info",     text: "Predictive: Solar −8 GW in 2h (cloud front NW)", time: "18:38" },
  { severity: "info",     text: "Demand spike forecast 88.3 GW at 18:30 EST", time: "18:40" },
];

const BATTERIES = [
  { region: "Nevada",   soc: 75, capacity: 200, dispatch: "+15 MW",  revenue: "$2,130/h", positive: true },
  { region: "Texas",    soc: 40, capacity: 150, dispatch: "−8 MW",   revenue: "−$456/h",  positive: false },
  { region: "New York", soc: 62, capacity: 180, dispatch: "+5 MW",   revenue: "$710/h",   positive: true },
];

const SCENARIOS = [
  "Cascade failure",
  "Cloud front",
  "Demand spike",
  "Battery optimize",
];

// ═══════════════════════════════════════════════════════════════
// CLOCK HOOK
// ═══════════════════════════════════════════════════════════════

function useUTCClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ═══════════════════════════════════════════════════════════════
// CHART OPTIONS
// ═══════════════════════════════════════════════════════════════

const miniChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: { ticks: { font: { size: 8 }, color: "#9a9880" }, grid: { color: "#ddd9c8" } },
    y: { ticks: { font: { size: 8 }, color: "#9a9880" }, grid: { color: "#ddd9c8" } },
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function AlertIcon({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "var(--color-danger)",
    warning: "var(--color-warning)",
    info: "var(--color-info)",
  };
  return (
    <div
      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm text-[9px] text-white"
      style={{ background: colors[severity] || "#888" }}
    >
      {severity === "info" ? "i" : "▲"}
    </div>
  );
}

function Badge({ children, variant }: { children: React.ReactNode; variant: "green" | "amber" | "red" }) {
  const styles: Record<string, { bg: string; color: string }> = {
    green: { bg: "#d4e8c2", color: "#3a6010" },
    amber: { bg: "#f0e4c4", color: "#7a5010" },
    red:   { bg: "#f0d4c4", color: "#8a3010" },
  };
  const s = styles[variant];
  return (
    <span
      className="rounded-sm px-1.5 py-0.5 text-[9px] font-medium tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}

function SoCBar({ pct }: { pct: number }) {
  const color = pct > 60 ? "#3a8840" : pct > 30 ? "#d06020" : "#c03820";
  return (
    <div className="inline-block h-2 w-16 overflow-hidden rounded-sm" style={{ background: "#e0dcc8" }}>
      <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{children}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-2 border-b pb-1 text-[10px] font-medium uppercase tracking-widest"
      style={{ color: "var(--text-muted)", borderColor: "var(--border-panel)" }}
    >
      {children}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="mt-0.5 h-[3px] w-full rounded-full" style={{ background: "#ddd9c8" }}>
      <div className="h-[3px] rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function DemoPage() {
  const clock = useUTCClock();

  return (
    <div className="flex min-h-screen flex-col text-xs" style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* ── HEADER ── */}
      <header
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--bg-dark)", borderBottom: "1px solid var(--border-dark)" }}
      >
        <span className="text-[15px] font-medium uppercase tracking-wider" style={{ color: "var(--text-on-dark)" }}>
          US Renewable Grid Command Center — Real-Time Operations
        </span>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-on-dark-muted)" }}>
          <span className="font-medium" style={{ color: "#c8c4aa" }}>{clock} UTC</span>
          <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: "var(--color-danger)" }} />
          <span className="text-[11px]">LIVE</span>
          <span className="cursor-pointer" style={{ color: "#aaa" }}>⚙</span>
        </div>
      </header>

      {/* ── KPI BAR ── */}
      <div
        className="grid grid-cols-5"
        style={{ background: "var(--bg-dark)", borderBottom: "1px solid var(--border-dark)" }}
      >
        {[
          { label: "Total Demand", value: "82.4", unit: "GW", color: "var(--text-on-dark)" },
          { label: "Renewable Gen", value: "76.8", unit: "GW", color: "var(--text-on-dark)" },
          { label: "Grid Balance", value: "+5.6", unit: "GW", color: "var(--color-ok)" },
          { label: "Curtailment", value: "1.2", unit: "GW", color: "var(--color-warning)", sub: "Wasted renewable" },
          { label: "CO₂ Intensity", value: "114", unit: "g/kWh", color: "var(--color-ok)", delta: "↓ 18% vs avg" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="px-2.5 py-2 text-center"
            style={{ borderRight: "1px solid var(--bg-dark-border)" }}
          >
            <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {kpi.label}
            </div>
            <div>
              <span className="text-lg font-normal" style={{ color: kpi.color }}>{kpi.value}</span>
              <span className="ml-0.5 text-[10px]" style={{ color: "#8a8870" }}>{kpi.unit}</span>
            </div>
            {kpi.sub && <div className="mt-0.5 text-[9px]" style={{ color: "#8a8870" }}>{kpi.sub}</div>}
            {kpi.delta && <div className="text-[10px]" style={{ color: "var(--color-ok)" }}>{kpi.delta}</div>}
          </div>
        ))}
      </div>

      {/* ── MAIN BODY ── */}
      <div className="grid flex-1 grid-cols-[168px_1fr_178px]" style={{ minHeight: 0 }}>
        {/* ── LEFT PANEL ── */}
        <div
          className="overflow-y-auto p-2.5"
          style={{ borderRight: "1px solid var(--border-light)" }}
        >
          <SectionTitle>Generation</SectionTitle>
          {GENERATION.map((g) => (
            <div key={g.type} className="mb-1.5 flex items-start gap-1.5">
              <span className="flex h-[18px] w-[18px] items-center justify-center text-sm">{g.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{g.type}</span>
                  <span className="text-xs font-medium">{g.value} GW</span>
                </div>
                <Bar pct={g.pct} color={g.color} />
              </div>
            </div>
          ))}

          <SectionTitle>Grid Health</SectionTitle>
          <StatRow label="Frequency">
            59.98 <span className="ml-1 text-[10px]" style={{ color: "var(--text-muted)" }}>Hz</span>{" "}
            <Badge variant="green">STABLE</Badge>
          </StatRow>
          <StatRow label="Inertia">
            <span style={{ color: "#c07820" }}>↓ MED</span>
          </StatRow>
          <div className="mb-1 h-1 w-full rounded-sm" style={{ background: "#e0dcc8" }}>
            <div className="h-1 rounded-sm" style={{ width: "72%", background: "linear-gradient(90deg, #e8a020, #5a9a20)" }} />
          </div>
          <div className="mb-1.5 text-[9px]" style={{ color: "var(--text-subtle)" }}>Synthetic inertia at 72%</div>
          <StatRow label="Reserve">+6.1 GW</StatRow>
          <StatRow label="Voltage">98.7%</StatRow>
          <StatRow label="Ramp rate"><span style={{ color: "#c07820" }}>+420 MW/min</span></StatRow>
          <StatRow label="TX Load">73%</StatRow>
          <Bar pct={73} color="#c07820" />

          <div className="mt-2.5">
            <SectionTitle>Interconnect Flow</SectionTitle>
            <StatRow label="West→East">+3.2 GW</StatRow>
            <StatRow label="ERCOT">
              Isolated <Badge variant="amber">ISO</Badge>
            </StatRow>
            <StatRow label="Canada">+0.8 GW</StatRow>
          </div>

          <div className="mt-2.5">
            <SectionTitle>Production (GW)</SectionTitle>
            <div className="h-16">
              <Line
                data={{
                  labels: ["00", "06", "12", "18", "24"],
                  datasets: [
                    { label: "Solar", data: [0, 5, 34, 28, 2], borderColor: "#e8a020", borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 },
                    { label: "Wind",  data: [22, 18, 28, 30, 25], borderColor: "#3a8ad4", borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 },
                    { label: "Demand", data: [60, 58, 75, 82, 70], borderColor: "#8a7848", borderWidth: 1, pointRadius: 0, fill: false, tension: 0.4, borderDash: [3, 2] },
                  ],
                }}
                options={miniChartOptions}
              />
            </div>
          </div>
        </div>

        {/* ── CENTER: MAP + BATTERY TABLE ── */}
        <div className="flex flex-col" style={{ background: "var(--bg-panel)" }}>
          {/* SVG Map */}
          <div className="relative flex-1 overflow-hidden" style={{ background: "#e8e4d4" }}>
            <svg className="h-full w-full" viewBox="0 0 560 380" xmlns="http://www.w3.org/2000/svg">
              <rect width="560" height="380" fill="#ddd9c8" />
              <path d="M30,80 L60,60 L120,50 L180,45 L260,40 L330,38 L390,42 L450,48 L500,55 L530,70 L540,100 L535,140 L520,170 L510,200 L505,230 L500,260 L490,280 L470,300 L440,310 L400,320 L360,325 L320,330 L280,332 L240,330 L200,325 L160,315 L130,305 L100,285 L80,260 L60,240 L40,220 L25,190 L20,160 L22,130 L28,100 Z" fill="#e8e4d4" stroke="#ccc8b4" strokeWidth="1" />

              {/* Water */}
              <ellipse cx="480" cy="120" rx="28" ry="18" fill="#b8d4e8" opacity="0.7" />
              <ellipse cx="450" cy="140" rx="22" ry="14" fill="#b8d4e8" opacity="0.6" />
              <path d="M400,90 Q420,85 440,92 Q445,100 430,105 Q410,108 398,100 Z" fill="#b8d4e8" opacity="0.6" />

              {/* Transmission lines */}
              <line x1="100" y1="140" x2="220" y2="160" stroke="#c08020" strokeWidth="1.5" strokeDasharray="6 4" className="animate-flow" />
              <line x1="220" y1="160" x2="350" y2="130" stroke="#c08020" strokeWidth="1.5" strokeDasharray="6 4" className="animate-flow" />
              <line x1="350" y1="130" x2="450" y2="120" stroke="#c08020" strokeWidth="1.5" strokeDasharray="6 4" className="animate-flow" />
              <line x1="450" y1="120" x2="450" y2="200" stroke="#8a9020" strokeWidth="1.2" strokeDasharray="6 4" />
              <line x1="350" y1="130" x2="380" y2="210" stroke="#c08020" strokeWidth="1.2" strokeDasharray="6 4" />
              <line x1="220" y1="160" x2="240" y2="240" stroke="#9a8020" strokeWidth="1" strokeDasharray="6 4" />
              {/* Congested line */}
              <line x1="380" y1="210" x2="450" y2="200" stroke="#d04020" strokeWidth="2" strokeDasharray="5 3" />
              <text x="415" y="215" fontSize="8" fill="#d04020" textAnchor="middle" fontFamily="sans-serif">94% load</text>

              {/* Solar farms */}
              <g className="animate-pulse">
                <rect x="75" y="215" width="22" height="18" rx="3" fill="#f0c050" stroke="#c09020" strokeWidth="1" />
                <text x="86" y="227" fontSize="8" textAnchor="middle" fill="#7a5010" fontFamily="sans-serif">☀</text>
              </g>
              <g className="animate-pulse" style={{ animationDelay: "0.4s" }}>
                <rect x="168" y="260" width="22" height="18" rx="3" fill="#f0c050" stroke="#c09020" strokeWidth="1" />
                <text x="179" y="272" fontSize="8" textAnchor="middle" fill="#7a5010" fontFamily="sans-serif">☀</text>
              </g>
              <g className="animate-pulse" style={{ animationDelay: "0.8s" }}>
                <rect x="295" y="258" width="22" height="18" rx="3" fill="#f0c050" stroke="#c09020" strokeWidth="1" />
                <text x="306" y="270" fontSize="8" textAnchor="middle" fill="#7a5010" fontFamily="sans-serif">☀</text>
              </g>

              {/* Wind farms */}
              <g className="animate-pulse" style={{ animationDelay: "0.3s" }}>
                <circle cx="160" cy="90" r="10" fill="#b8d8f0" stroke="#3a8ad4" strokeWidth="1" />
                <text x="160" y="94" fontSize="9" textAnchor="middle" fill="#1a4870" fontFamily="sans-serif">🌬</text>
              </g>
              <g className="animate-pulse" style={{ animationDelay: "0.9s" }}>
                <circle cx="290" cy="165" r="10" fill="#b8d8f0" stroke="#3a8ad4" strokeWidth="1" />
                <text x="290" y="169" fontSize="9" textAnchor="middle" fill="#1a4870" fontFamily="sans-serif">🌬</text>
              </g>
              <g className="animate-pulse" style={{ animationDelay: "1.4s" }}>
                <circle cx="370" cy="185" r="10" fill="#b8d8f0" stroke="#3a8ad4" strokeWidth="1" />
                <text x="370" y="189" fontSize="9" textAnchor="middle" fill="#1a4870" fontFamily="sans-serif">🌬</text>
              </g>

              {/* Hydro */}
              <circle cx="105" cy="145" r="9" fill="#c8ede8" stroke="#3aada0" strokeWidth="1" />
              <text x="105" y="149" fontSize="8" textAnchor="middle" fill="#1a5850" fontFamily="sans-serif">💧</text>

              {/* Grid hubs */}
              <circle cx="220" cy="160" r="7" fill="#1a1a0e" stroke="#c8c4aa" strokeWidth="1" />
              <circle cx="350" cy="130" r="8" fill="#1a1a0e" stroke="#c8c4aa" strokeWidth="1" />
              <circle cx="450" cy="120" r="7" fill="#1a1a0e" stroke="#c8c4aa" strokeWidth="1" />
              <circle cx="380" cy="210" r="7" fill="#1a1a0e" stroke="#c8c4aa" strokeWidth="1" />
              <circle cx="450" cy="200" r="7" fill="#1a1a0e" stroke="#e8a020" strokeWidth="1.5" />

              {/* City labels */}
              <text x="95" y="165" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">Seattle</text>
              <text x="75" y="230" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">SF</text>
              <text x="75" y="275" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">LA</text>
              <text x="215" y="190" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">Denver</text>
              <text x="335" y="155" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">Chicago</text>
              <text x="440" y="140" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">Boston</text>
              <text x="365" y="230" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">Dallas</text>
              <text x="430" y="218" fontSize="9" fill="#d04020" fontFamily="sans-serif" fontWeight="500">Atlanta ⚠</text>
              <text x="420" y="305" fontSize="9" fill="#3a3828" fontFamily="sans-serif" fontWeight="500">Miami</text>

              {/* Weather front */}
              <path d="M100,50 Q160,30 220,55 Q180,90 120,80 Z" fill="#b8c8e0" opacity="0.35" />
              <text x="155" y="62" fontSize="7" fill="#3a5878" textAnchor="middle" fontFamily="sans-serif">Cloud front</text>
              <text x="155" y="72" fontSize="7" fill="#3a5878" textAnchor="middle" fontFamily="sans-serif">↓ solar −8GW in 2h</text>

              {/* CO₂ legend */}
              <rect x="16" y="295" width="90" height="58" rx="3" fill="#ede9d8" stroke="#ccc8b4" strokeWidth="0.5" opacity="0.9" />
              <text x="24" y="308" fontSize="8" fill="#5a5848" fontFamily="sans-serif" fontWeight="500">CO₂ INTENSITY</text>
              <rect x="20" y="313" width="12" height="8" rx="1" fill="#c8e8c0" />
              <text x="36" y="321" fontSize="8" fill="#5a5848" fontFamily="sans-serif">West: 88g</text>
              <rect x="20" y="325" width="12" height="8" rx="1" fill="#f0e8b0" />
              <text x="36" y="333" fontSize="8" fill="#5a5848" fontFamily="sans-serif">Mid: 142g</text>
              <rect x="20" y="337" width="12" height="8" rx="1" fill="#f0c8a0" />
              <text x="36" y="345" fontSize="8" fill="#5a5848" fontFamily="sans-serif">East: 178g</text>

              {/* Map legend */}
              <rect x="198" y="295" width="120" height="70" rx="3" fill="#ede9d8" stroke="#ccc8b4" strokeWidth="0.5" opacity="0.9" />
              <text x="206" y="308" fontSize="8" fill="#5a5848" fontFamily="sans-serif" fontWeight="500">LEGEND</text>
              <rect x="202" y="313" width="10" height="7" rx="1" fill="#f0c050" stroke="#c09020" strokeWidth="0.5" />
              <text x="216" y="320" fontSize="8" fill="#5a5848" fontFamily="sans-serif">Solar plant</text>
              <circle cx="207" cy="330" r="5" fill="#b8d8f0" stroke="#3a8ad4" strokeWidth="0.5" />
              <text x="216" y="333" fontSize="8" fill="#5a5848" fontFamily="sans-serif">Wind farm</text>
              <circle cx="207" cy="342" r="5" fill="#c8ede8" stroke="#3aada0" strokeWidth="0.5" />
              <text x="216" y="345" fontSize="8" fill="#5a5848" fontFamily="sans-serif">Hydro</text>
              <line x1="200" y1="354" x2="215" y2="354" stroke="#d04020" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="218" y="357" fontSize="8" fill="#d04020" fontFamily="sans-serif">Congested line</text>
            </svg>
          </div>

          {/* Battery table */}
          <div className="border-t p-2.5" style={{ background: "var(--bg-panel)", borderColor: "var(--border-light)" }}>
            <div className="mb-1.5 text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Battery Storage
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Region", "Charge", "SoC", "Capacity", "Dispatch", "Revenue"].map((h) => (
                    <th
                      key={h}
                      className="border-b px-1 py-0.5 text-left text-[9px] font-normal uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", borderColor: "var(--border-panel)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BATTERIES.map((b) => (
                  <tr key={b.region}>
                    <td className="border-b px-1 py-1 text-[11px]" style={{ borderColor: "var(--border-row)" }}>{b.region}</td>
                    <td className="border-b px-1 py-1" style={{ borderColor: "var(--border-row)" }}>
                      <SoCBar pct={b.soc} />
                    </td>
                    <td className="border-b px-1 py-1 text-[11px]" style={{ borderColor: "var(--border-row)" }}>{b.soc}%</td>
                    <td className="border-b px-1 py-1 text-[11px]" style={{ borderColor: "var(--border-row)" }}>{b.capacity} MWh</td>
                    <td
                      className="border-b px-1 py-1 text-[11px] font-medium"
                      style={{ borderColor: "var(--border-row)", color: b.positive ? "#3a7820" : "#c03820" }}
                    >
                      {b.dispatch}
                    </td>
                    <td
                      className="border-b px-1 py-1 text-[10px]"
                      style={{ borderColor: "var(--border-row)", color: b.positive ? "#3a6010" : "#c03820" }}
                    >
                      {b.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="overflow-y-auto p-2.5"
          style={{ borderLeft: "1px solid var(--border-light)" }}
        >
          <SectionTitle>Alerts</SectionTitle>
          {ALERTS.map((a, i) => (
            <div
              key={i}
              className="mb-2 flex items-start gap-1.5 border-b pb-2"
              style={{ borderColor: i < ALERTS.length - 1 ? "var(--border-row)" : "transparent" }}
            >
              <AlertIcon severity={a.severity} />
              <span className="flex-1 text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                {a.text}
              </span>
              <span className="flex-shrink-0 text-[10px]" style={{ color: "var(--text-subtle)" }}>
                {a.time}
              </span>
            </div>
          ))}

          <div className="mt-2">
            <SectionTitle>Market Price</SectionTitle>
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="text-[22px] font-normal">$142</span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>/MWh</span>
              <span className="text-xs" style={{ color: "#d06020" }}>↑ 8.3%</span>
            </div>
            <div className="mb-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
              Carbon credit: $48/t · Curtailment cost: $1.4M today
            </div>
            <div className="h-20">
              <Line
                data={{
                  labels: ["12:00", "14:00", "16:00", "18:00", "20:00"],
                  datasets: [{
                    data: [118, 128, 135, 142, 138],
                    borderColor: "#c08020",
                    borderWidth: 1.5,
                    pointRadius: 2,
                    pointBackgroundColor: "#c08020",
                    fill: true,
                    backgroundColor: "rgba(192,128,32,0.08)",
                    tension: 0.3,
                  }],
                }}
                options={{
                  ...miniChartOptions,
                  scales: {
                    ...miniChartOptions.scales,
                    y: { ...miniChartOptions.scales.y, ticks: { ...miniChartOptions.scales.y.ticks, callback: (v: string | number) => `$${v}` } },
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-2.5">
            <SectionTitle>Demand Forecast — 24h</SectionTitle>
            <div className="mb-1 text-[10px]" style={{ color: "#c04828" }}>Peak: 88.3 GW at ~18:30 EST</div>
            <div className="h-20">
              <Line
                data={{
                  labels: ["Now", "6h", "12h", "18h", "24h"],
                  datasets: [{
                    data: [82.4, 78, 75, 88.3, 76],
                    borderColor: "#3a6898",
                    borderWidth: 1.5,
                    pointRadius: [3, 2, 2, 4, 2],
                    pointBackgroundColor: ["#3a6898", "#3a6898", "#3a6898", "#d04828", "#3a6898"],
                    fill: true,
                    backgroundColor: "rgba(58,104,152,0.1)",
                    tension: 0.4,
                  }],
                }}
                options={{ ...miniChartOptions, scales: { ...miniChartOptions.scales, y: { ...miniChartOptions.scales.y, min: 60, max: 95 } } }}
              />
            </div>
          </div>

          <div className="mt-2.5">
            <SectionTitle>Scenario Engine</SectionTitle>
            <div className="mb-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
              Simulate what-if events
            </div>
            <div className="flex flex-wrap gap-1">
              {SCENARIOS.map((s) => (
                <span
                  key={s}
                  className="cursor-pointer rounded-sm border px-2 py-0.5 text-[10px] transition-colors"
                  style={{ borderColor: "#b0ac98", color: "var(--text-secondary)", background: "var(--bg-panel)" }}
                >
                  {s} ↗
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2.5">
            <SectionTitle>Asset Health</SectionTitle>
            <StatRow label="Underperforming">
              <span style={{ color: "#c04828" }}>4 assets</span>
            </StatRow>
            <StatRow label="Maintenance queue">7 scheduled</StatRow>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              TX Wind Farm B: −22% vs expected
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <footer className="flex" style={{ background: "var(--bg-dark)", borderTop: "1px solid var(--border-dark)" }}>
        {[
          "⊟ Simulate Outage",
          "⊟ Run Forecast",
          "⊟ Battery Dispatch",
          "⊙ Grid Stability",
          "⊟ Export Report",
        ].map((label, i) => (
          <div
            key={label}
            className="flex-1 cursor-pointer py-2 text-center text-[10px] uppercase tracking-wider transition-colors"
            style={{ color: "var(--text-subtle)", borderRight: i < 4 ? "1px solid var(--bg-dark-border)" : "none" }}
          >
            {label}
          </div>
        ))}
      </footer>
    </div>
  );
}
