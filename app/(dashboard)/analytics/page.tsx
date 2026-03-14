/*
  ANALYTICS — Historical data dashboards
  ────────────────────────────────────────
  URL: /analytics
  Will show: Chart.js dashboards for historical analysis.
  Fuel mix over time, CO₂ intensity, curtailment cost, battery revenue,
  frequency stability, forecast accuracy.

  Data is queried directly from Postgres using time-bucket aggregations.
*/

export default function AnalyticsPage() {
  return (
    <div className="p-4">
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Analytics
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
        Historical fuel mix, CO₂ trends, curtailment costs, battery revenue — coming soon.
      </p>
    </div>
  );
}
