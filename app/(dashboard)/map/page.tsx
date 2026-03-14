/*
  OPS MAP — Full-screen Mapbox view
  ──────────────────────────────────
  URL: /map
  Will show: Mapbox GL full-screen map with generation nodes, transmission lines,
  weather overlay, congestion highlighting, and click-to-inspect panels.

  This page will be a Client Component because Mapbox GL requires browser APIs.
*/

export default function MapPage() {
  return (
    <div className="flex h-full items-center justify-center" style={{ background: "var(--bg-panel)" }}>
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Ops Map — Mapbox GL will render here
      </p>
    </div>
  );
}
