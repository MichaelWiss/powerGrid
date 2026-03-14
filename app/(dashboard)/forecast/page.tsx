/*
  FORECAST — 24-hour forecast room
  ─────────────────────────────────
  URL: /forecast
  Will show: solar forecast grid, regional cards, cloud cover warnings,
  demand confidence bands, ramp rate chart, peak alert banner.

  Data comes from Open-Meteo weather API + our solar/demand models.
*/

export default function ForecastPage() {
  return (
    <div className="p-4">
      <p style={{ color: "var(--text-muted)" }} className="text-sm uppercase tracking-wider">
        Forecast Room
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-subtle)" }}>
        24-hour solar and demand forecasts with confidence bands — coming soon.
      </p>
    </div>
  );
}
