/*
  GRID TYPE CONSTANTS
  ───────────────────
  Single source of truth for plant-type colours and icons.
  Used by GridMap (Mapbox layers), DashboardMap, MapPageClient,
  and the CommandCenter generation panel.

  Colours are hex so they work both in Mapbox GL data-driven expressions
  *and* in React inline styles. CSS variables cannot be used in Mapbox expressions.
*/

export const TYPE_COLORS = {
  solar:   "#e8a020",
  wind:    "#3a8ad4",
  hydro:   "#3aada0",
  gas:     "#c05030",
  battery: "#5a7ad4",
} as const;

export const TYPE_ICONS = {
  solar:   "☀",
  wind:    "🌬",
  hydro:   "💧",
  gas:     "🔥",
  battery: "🔋",
} as const;

export type PlantType = keyof typeof TYPE_COLORS;
