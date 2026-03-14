/*
  ASSETS — Fleet health dashboard
  ────────────────────────────────
  URL: /assets
  Will show: health table for all generation nodes, performance vs expected,
  anomaly score badges, maintenance calendar, degradation trend charts.
*/

export default function AssetsPage() {
  return (
    <div className="p-4">
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Asset Health
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
        Fleet-wide health scores, anomaly detection, and maintenance scheduling — coming soon.
      </p>
    </div>
  );
}
