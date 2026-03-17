/*
  DASHBOARD LAYOUT
  ────────────────
  This is a Route Group layout — the (dashboard) folder does NOT appear in the URL.
  All pages inside this folder share this shell: header, nav bar, and bottom bar.

  CONCEPTS TO LEARN:
  - Route Groups: folders wrapped in () create shared layouts without affecting URLs
  - Layout nesting: this renders INSIDE the root layout (app/layout.tsx)
  - Server Components: this file runs on the server by default (no "use client")
  - The {children} slot is where each page's content renders
*/
"use client";

import { useEffect, useState } from "react";
import RealtimeProvider from "@/components/RealtimeProvider";

const NAV_ITEMS = [
  { href: "/",          label: "Command Center" },
  { href: "/map",       label: "Ops Map" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/forecast",  label: "Forecast" },
  { href: "/batteries", label: "Batteries" },
  { href: "/assets",    label: "Assets" },
  { href: "/analytics", label: "Analytics" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* HEADER */}
      <header
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--bg-dark)", borderBottom: "1px solid var(--border-dark)" }}
      >
        <h1
          className="text-[15px] font-medium uppercase tracking-wider"
          style={{ color: "var(--text-on-dark)" }}
        >
          US Renewable Grid Command Center — <span className="font-normal" style={{ color: "var(--text-on-dark-muted)" }}>Real-Time Operations</span>
        </h1>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-on-dark-muted)" }}>
          <UtcClock />
          <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--color-danger)" }} />
          <span className="text-[11px]">LIVE</span>
        </div>
      </header>

      {/* NAV BAR */}
      <nav
        className="flex overflow-x-auto"
        style={{ background: "var(--bg-dark)", borderBottom: "1px solid var(--border-dark)" }}
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="px-4 py-2 text-[10px] uppercase tracking-wider transition-colors"
            style={{ color: "var(--text-on-dark-muted)", borderRight: "1px solid var(--bg-dark-border)" }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* PAGE CONTENT — each page renders here */}
      <main className="relative min-h-0 flex-1 overflow-auto">
        <RealtimeProvider>{children}</RealtimeProvider>
      </main>

      {/* BOTTOM BAR */}
      <footer className="flex" style={{ background: "var(--bg-dark)", borderTop: "1px solid var(--border-dark)" }}>
        {["Simulate Outage", "Run Forecast", "Battery Dispatch", "Grid Stability", "Export Report"].map(
          (label) => (
            <div
              key={label}
              className="flex-1 cursor-pointer py-2 text-center text-[10px] uppercase tracking-wider transition-colors hover:text-[#e8e4d4]"
              style={{ color: "var(--text-subtle)", borderRight: "1px solid var(--bg-dark-border)" }}
            >
              {label}
            </div>
          )
        )}
      </footer>
    </div>
  );
}

function UtcClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toISOString().slice(11, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color: "var(--text-on-dark)", fontVariantNumeric: "tabular-nums" }}>
      {time}
    </span>
  );
}
