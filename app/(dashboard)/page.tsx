/*
  COMMAND CENTER — Main dashboard page
  ─────────────────────────────────────
  URL: /
  This is the home page. It will show the full operations dashboard:
  KPI bar, generation mix, map, alerts, market price, battery table.

  Right now it's a placeholder. We'll build each panel as a component
  and compose them here.
*/

export default function CommandCenterPage() {
  return (
    <div className="p-4">
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Command Center
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
        KPI bar, generation panel, live map, alerts feed, market price, battery table — coming soon.
      </p>
    </div>
  );
}
