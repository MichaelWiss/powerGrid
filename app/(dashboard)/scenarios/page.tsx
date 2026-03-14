/*
  SCENARIOS — Simulation engine UI
  ─────────────────────────────────
  URL: /scenarios
  Will show: scenario type selector, node picker map, parameter sliders,
  run button, cascade timeline, before/after map split, load shed summary.

  This page calls the Python simulation service via /api/simulate.
*/

export default function ScenariosPage() {
  return (
    <div className="p-4">
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Scenario Engine
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
        Simulate outages, cascade failures, demand spikes, and weather events — coming soon.
      </p>
    </div>
  );
}
