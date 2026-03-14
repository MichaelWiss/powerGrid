/*
  BATTERIES — Storage operations
  ───────────────────────────────
  URL: /batteries
  Will show: SoC gauges per battery asset, charge/discharge history,
  revenue table, dispatch controls, and an "optimize" button that
  calls the Python service to find the best dispatch schedule.
*/

export default function BatteriesPage() {
  return (
    <div className="p-4">
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Battery Storage
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
        SoC gauges, dispatch controls, charge history, and revenue tracking — coming soon.
      </p>
    </div>
  );
}
