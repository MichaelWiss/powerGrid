# Grid Command Center — Learning Plan

A guided curriculum for building a real-time US renewable energy grid operations dashboard from scratch. Each iteration builds on the last — nothing is thrown away. By the end, you'll understand full-stack React, real-time data, geographic visualization, and power systems modeling.

---

## Iteration 1 — Routing & Layout ✅ (Complete)

### What You Built
- Next.js App Router project with 7 pages
- Route Group layout `(dashboard)/` with shared header, nav, footer
- CSS design tokens matching the mockup palette
- Supabase schema (10 tables, indexes, RLS, Realtime)

### Concepts Covered

**App Router File Conventions**
Next.js uses the file system for routing. A `page.tsx` file inside a folder becomes a route:
```
app/(dashboard)/map/page.tsx  →  URL: /map
app/(dashboard)/batteries/page.tsx  →  URL: /batteries
```

**Route Groups**
Folders wrapped in parentheses `(dashboard)` create shared layouts without adding to the URL. Every page inside shares the same header, nav bar, and footer — but the URL stays clean (`/map`, not `/dashboard/map`).

**Layout Nesting**
Layouts wrap around child content. The root `layout.tsx` provides `<html>` and `<body>`. The dashboard `layout.tsx` adds header/nav/footer. Each page's content renders in the `{children}` slot. They nest like Russian dolls:
```
Root Layout (html, body, fonts)
  └── Dashboard Layout (header, nav, footer)
       └── Page Content (your specific page)
```

**Server Components**
Every `.tsx` file is a Server Component by default. It runs on the server, renders to HTML, and ships **zero JavaScript** to the browser. This is why the pages load fast — nothing to download, parse, or execute client-side. You only opt into client-side JS when you need browser APIs (maps, charts, interactivity).

**CSS Custom Properties**
Instead of hard-coding colors everywhere, we defined design tokens in `globals.css`:
```css
:root {
  --color-solar: #e8a020;
  --color-wind: #3a8ad4;
  --color-danger: #e84a2a;
}
```
Every component references these. Change one value, the entire app updates. This is the same pattern used by every major design system (Material, Radix, shadcn).

---

## Iteration 2 — Supabase & Seed Data

### What You'll Build
- Supabase project connected to the app
- 20 real US power plant locations seeded into the database
- A Server Component that fetches and displays nodes on the home page

### Concepts You'll Learn

**Supabase = Postgres + Auth + Realtime**
Supabase is a managed PostgreSQL database with extras bolted on. You get:
- A full SQL database (same as Instagram, Spotify, etc. use)
- Authentication (login/signup)
- Realtime subscriptions (live updates pushed to browsers)
- Auto-generated REST APIs (no need to write CRUD endpoints)
- Row Level Security (database enforces who can see what)

**PostGIS — Geographic Queries**
PostGIS adds geography support to Postgres. A `GEOGRAPHY(POINT, 4326)` column stores latitude/longitude. You can then query things like "find all solar plants within 100 miles of Denver" using SQL — the database does the spatial math.

```sql
-- Find nodes within 100km of Denver
SELECT name, type, capacity_mw
FROM generation_nodes
WHERE ST_DDistance(location, ST_MakePoint(-104.99, 39.74)::geography) < 100000;
```

**Row Level Security (RLS)**
Instead of checking permissions in your API code, Postgres itself enforces access rules:
```sql
-- Anyone can read nodes
CREATE POLICY "Allow public read" ON generation_nodes FOR SELECT USING (true);
-- Only the service role (your server) can write
CREATE POLICY "Service write" ON generation_nodes FOR INSERT USING (auth.role() = 'service_role');
```
Even if someone gets your database URL, they can't write data — the database rejects it.

**Server Component Data Fetching**
In App Router, you fetch data directly inside the component. No `useEffect`, no loading states for the initial render — the page arrives with data already in it:
```tsx
// This runs on the server. The browser never sees this code.
export default async function Page() {
  const { data: nodes } = await supabase.from('generation_nodes').select('*');
  return <NodeList nodes={nodes} />;
}
```

**The Supabase Client Pattern**
You need two clients:
- **Browser client** (`anon` key) — used in client components, respects RLS
- **Server client** (`service_role` key) — used in Server Components and API routes, bypasses RLS for writes

The service role key is a secret — it never leaves the server.

---

## Iteration 3 — The Map ✅ (Complete)

### What You Built
- Full-screen Mapbox GL map on `/map`
- 20 generation nodes as color-coded markers (solar=gold, wind=blue, hydro=teal, etc.)
- 16 transmission lines seeded and rendered on the live map
- Click a node → side panel with details
- Reusable map component shared between `/map` (full-screen) and `/` (embedded compact map)

### Concepts You'll Learn

**"use client" — Client Components**
Mapbox GL needs access to the `window` object and the DOM — things that don't exist on the server. Adding `"use client"` at the top of a file tells Next.js: "this component needs to run in the browser."
```tsx
"use client";
import mapboxgl from 'mapbox-gl';
// This code runs in the browser
```

Rule of thumb: use Server Components by default. Only add `"use client"` when you need:
- Browser APIs (DOM, `window`, `navigator`)
- Event handlers (`onClick`, `onChange`)
- React hooks (`useState`, `useEffect`)
- Third-party libraries that require the browser (Mapbox, Chart.js)

**GeoJSON — The Language of Maps**
GeoJSON is a standard format for geographic data. Mapbox speaks it natively:
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [-115.17, 36.11] },
  "properties": { "name": "Nevada Solar Farm", "type": "solar", "capacity_mw": 250 }
}
```
Our Postgres rows get transformed into GeoJSON features. Mapbox renders them as markers, and the `properties` control styling (color, size, icon).

**Data-Driven Styling**
Instead of styling each marker manually, you tell Mapbox: "color markers based on their `type` property":
```js
paint: {
  'circle-color': [
    'match', ['get', 'type'],
    'solar', '#e8a020',
    'wind', '#3a8ad4',
    'hydro', '#3aada0',
    '#888' // default
  ]
}
```
Add 100 more nodes — they style themselves automatically.

**Component Composition**
The `<GridMap>` component is used in two places:
- `/map` — full-screen, all controls visible
- `/` — embedded in the dashboard, constrained height, fewer controls

Same component, different props. This is React's core power — build once, compose everywhere.

---

## Iteration 4 — Real-Time with Supabase Realtime

### What You'll Build
- Zustand store for live grid state
- `RealtimeProvider` that opens a WebSocket to Supabase
- Live updates: insert a row in Supabase → browser updates instantly
- Map markers update position/color in real-time

### Concepts You'll Learn

**Push vs Pull**
- **Pull (polling):** Browser asks the server "anything new?" every N seconds. Wastes requests when nothing changed. Misses events between polls.
- **Push (WebSocket):** Server tells the browser the instant something changes. Zero wasted requests. Sub-100ms latency.

Supabase Realtime is push-based. Under the hood:
1. You INSERT a row into `grid_snapshots`
2. Postgres fires a NOTIFY event (built into Postgres)
3. Supabase Realtime server picks it up
4. It pushes the change over WebSocket to all subscribed browsers
5. Your React component re-renders with new data

**Zustand — State Management**
Zustand is a tiny state store (1KB). Components subscribe to slices of state and re-render only when their slice changes:
```tsx
const useGridStore = create((set) => ({
  nodes: [],
  latestSnapshot: null,
  alerts: [],
  updateNode: (node) => set((state) => ({
    nodes: state.nodes.map(n => n.id === node.id ? node : n)
  })),
}));
```
Any component can read `useGridStore(s => s.latestSnapshot)` — it automatically re-renders when that value changes.

**The Provider Pattern**
The `RealtimeProvider` wraps your app and manages the WebSocket connection lifecycle:
- Opens the connection when the app mounts
- Subscribes to table changes
- Pipes incoming data into the Zustand store
- Cleans up when the app unmounts

All components downstream get live updates without knowing or caring about WebSockets.

**Mapbox `setData()` — Surgical Updates**
When new data arrives, we don't destroy and recreate the map. We call `source.setData(newGeoJSON)` — Mapbox diffs it internally and only repaints changed markers. The map stays smooth at 60fps even with constant updates.

---

## Iteration 5 — SCADA Simulator & Cron

### What You'll Build
- SCADA telemetry simulator (fake but realistic sensor data)
- Solar model: weather → electricity output prediction
- Cron job that fires every minute, writes to database
- The full live data loop: cron → Postgres → Realtime → browser

### Concepts You'll Learn

**API Route Handlers**
In App Router, most data fetching happens in Server Components. But cron jobs need a URL to hit — that's what Route Handlers are for:
```
app/api/cron/ingest-grid/route.ts  →  POST /api/cron/ingest-grid
```
They're the thin minority — most of your app won't need them.

**The Solar Model**
A solar panel's output depends on sunlight and clouds. The model is simple:
```
output_mw = capacity_mw × (GHI / 1000) × efficiency × (1 - cloud_cover / 100)
```
- **GHI** (Global Horizontal Irradiance): how much sunlight hits the ground, in W/m². We get this from Open-Meteo.
- **Capacity**: the panel's maximum rated output
- **Efficiency**: real panels lose ~5% to heat, wiring, inverters
- **Cloud cover**: 0% = clear sky (full output), 100% = overcast (near zero)

At night, GHI = 0, so output = 0. Automatically handles sunrise/sunset.

**Random Walk Simulation**
Real grid data fluctuates continuously. We simulate this with a random walk:
```
next_value = current_value + random_delta
```
Constrained within realistic bounds (frequency: 59.95–60.05 Hz, voltage: 97–101%). This produces smooth, believable time series data — far more realistic than random numbers.

**Cron Scheduling**
Vercel Cron (or Supabase `pg_cron`) calls your API route on a schedule:
```json
{ "path": "/api/cron/ingest-grid", "schedule": "* * * * *" }
```
`* * * * *` = every minute. The route generates telemetry, writes it, and Supabase Realtime does the rest.

---

## Iteration 6 — KPI Bar & Dashboard Panels

### What You'll Build
- KPI bar with 5 live metrics
- Generation panel (5 source bars with real data)
- Grid health section (frequency, inertia, voltage, ramp rate)
- Alerts feed (live, newest first)
- Market price card with mini chart
- Battery table with SoC bars

### Concepts You'll Learn

**Server Components for Initial Load + Realtime for Updates**
The dashboard uses a hybrid approach:
1. Page loads → Server Component fetches the latest snapshot from Postgres → HTML arrives with data already rendered (fast, no loading spinner)
2. Browser hydrates → RealtimeProvider connects → live updates flow in

The user sees data immediately AND gets real-time updates. Best of both worlds.

**Component Architecture**
Each panel is its own component with a single responsibility:
```
<KpiBar snapshot={latestSnapshot} />
<GenerationPanel snapshot={latestSnapshot} />
<AlertsFeed alerts={activeAlerts} />
```
They're composed on the page like building blocks. Each one is independently testable.

**CSS Grid Layout**
The 3-column dashboard uses CSS Grid:
```css
grid-template-columns: 168px 1fr 178px;
```
Left panel is fixed-width. Center is fluid. Right panel is fixed-width. Below 1024px, it stacks vertically. CSS Grid handles this natively — no JavaScript layout calculations.

**Chart.js in React**
Chart.js runs in the browser, so chart components need `"use client"`. The pattern:
```tsx
"use client";
import { Line } from 'react-chartjs-2';
export function PriceChart({ data }) {
  return <Line data={data} options={options} />;
}
```
Server Component fetches data → passes it as props → Client Component renders the chart.

**Live Data Wiring (Future)**
Several dashboard sections currently use static/mock values and will be wired to live Supabase data in later iterations:
- **Alerts feed** — currently reads from Zustand store hydrated with mock alerts. Will subscribe to the `alerts` table via Supabase Realtime (Iteration 5 cron + Iteration 7 Server Actions for acknowledge).
- **Battery Storage table** — hardcoded 3 rows. Will read from a `battery_storage` table with real SoC, dispatch, and revenue data once the SCADA simulator (Iteration 5) generates it.
- **Interconnect Flow** — static values (West→East +3.2 GW, ERCOT Isolated, Canada +0.8 GW). Will come from an `interconnect_flows` table or computed from transmission line data.
- **Market Price delta & carbon credit** — static display. Will be computed from time-series `grid_snapshots` data (current vs. rolling average).
- **Demand Forecast** — placeholder mini bar chart. Will be replaced with real forecast data from the weather/demand model (Iteration 8).
- **Asset Health** — static counts (4 underperforming, 7 scheduled). Will query `generation_nodes` filtering by efficiency thresholds and maintenance status.
- **Scenario Engine buttons** — UI-only placeholders. Will trigger PyPSA simulations (Iteration 9).

---

## Iteration 7 — Server Actions & Mutations

### What You'll Build
- "Acknowledge" button on alerts
- Battery dispatch controls (charge/discharge slider)
- Maintenance notes on asset health
- Form validation with Zod

### Concepts You'll Learn

**Server Actions — The Modern Way to Mutate**
Instead of creating API endpoints for every mutation, you write a function with `"use server"` and call it from a form:
```tsx
// actions/acknowledge-alert.ts
"use server";
export async function acknowledgeAlert(alertId: string) {
  await supabase.from('alerts').update({ acknowledged: true }).eq('id', alertId);
}
```
```tsx
// In your component
<form action={acknowledgeAlert.bind(null, alert.id)}>
  <button type="submit">Acknowledge</button>
</form>
```
No fetch calls. No API routes. No loading state management. Next.js handles it all.

**Zod — Validation That Generates Types**
Zod validates data at runtime AND gives you TypeScript types for free:
```tsx
const DispatchSchema = z.object({
  batteryId: z.string().uuid(),
  dispatchMw: z.number().min(-100).max(100),
});
type DispatchInput = z.infer<typeof DispatchSchema>; // TypeScript type, auto-generated
```
One schema, two jobs: runtime safety + compile-time types.

**Battery SoC Math**
When you dispatch a battery, the new state of charge is:
```
new_soc = current_soc - (dispatch_mw × hours / capacity_mwh × 100)
```
- Positive dispatch = discharging (SoC goes down, selling power)
- Negative dispatch = charging (SoC goes up, buying power)
- Clamped to 10–90% to protect battery health

---

## Iteration 8 — Weather & Forecast

### What You'll Build
- Open-Meteo weather API integration
- Solar forecast generation using the weather → power model
- Demand forecast model (temperature + time-of-day + day-of-week)
- `/forecast` page with charts, confidence bands, warnings

### Concepts You'll Learn

**External API Integration**
Open-Meteo is free, no API key needed. You fetch weather for each node's coordinates:
```
GET https://api.open-meteo.com/v1/forecast?latitude=36.11&longitude=-115.17&hourly=ghi,cloud_cover,temperature_2m
```
Returns 7 days of hourly forecasts. We run each hour through the solar model to predict power output.

**The Demand Model**
Electricity demand follows predictable patterns:
- **Hot days** → more A/C → higher demand
- **6 PM weekday** → everyone home, cooking, watching TV → peak demand
- **3 AM Sunday** → minimum demand

The model is a lookup table adjusted by temperature:
```
base_demand = HOURLY_PROFILE[hour] × DAY_FACTOR[dayOfWeek]
temp_adjustment = (temperature - 20) × 0.5  // GW per °C above/below 20°C
predicted_demand = base_demand + temp_adjustment
```

**Confidence Bands**
No forecast is exact. We show uncertainty:
- **Center line**: predicted value
- **Shaded band**: ±10% confidence interval
- **Wider band at longer horizons**: 2-hour forecast is tighter than 24-hour forecast

This is how professional grid operators read forecasts — they plan for the range, not the point.

---

## Iteration 9 — Python Simulation Service

### What You'll Build
- FastAPI service (~150 lines) with PyPSA power flow solver
- `/api/simulate` proxy route in Next.js
- `/scenarios` page: pick a scenario, set parameters, run, see results
- Cascade failure visualization on the map

### Concepts You'll Learn

**PyPSA — Power Systems Analysis**
PyPSA is a Python library that models electrical grids. You define:
- **Buses** (connection points)
- **Generators** (power plants — solar, wind, gas)
- **Lines** (transmission connections with capacity limits)
- **Loads** (demand at each bus)
- **Storage** (batteries)

Then you ask: "if this node goes offline, what happens?" PyPSA solves the optimal power flow using a linear programming solver (HiGHS) and tells you which lines overload, which generators ramp up, and whether any load is shed (blackout).

**Cascade Failure Simulation**
A cascade is a chain reaction:
1. Node A trips offline → Line B–C overloads (it was carrying A's power)
2. Line B–C trips on overload protection → Node D loses supply
3. Node D goes offline → Line E–F overloads...

The simulation runs this step by step, recording each event with a timestamp. The UI shows it as an animated timeline on the map.

**Service-to-Service Auth**
The Python service is on a separate server (Render). Next.js calls it via HTTP:
```tsx
const res = await fetch(PYTHON_SIM_URL + '/simulate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Sim-Secret': process.env.PYTHON_SIM_SECRET,  // Server-side only
  },
  body: JSON.stringify(params),
});
```
The secret is added server-side — the browser never sees it. The Python service rejects requests without it.

---

## Iteration 10 — Analytics, Auth & Polish

### What You'll Build
- `/analytics` with historical Chart.js dashboards
- Supabase Auth (GitHub OAuth login)
- Rate limiting on simulation API
- Dark mode, responsive fixes, performance optimization

### Concepts You'll Learn

**Time-Bucket Aggregations**
Raw data is too granular for historical charts. You aggregate:
```sql
SELECT
  date_trunc('hour', time) AS bucket,
  avg(solar_gw) AS avg_solar,
  avg(wind_gw) AS avg_wind
FROM grid_snapshots
WHERE time > now() - interval '7 days'
GROUP BY bucket
ORDER BY bucket;
```
This turns thousands of rows into ~168 data points (7 days × 24 hours) — perfect for a chart.

**Supabase Auth + RLS**
After adding login, RLS policies become user-aware:
```sql
CREATE POLICY "Authenticated read" ON simulation_runs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Own simulations only" ON simulation_runs
  FOR SELECT USING (auth.uid() = user_id);
```
The database itself enforces that users only see their own simulations — even if your application code has a bug.

**Next.js Middleware**
Middleware runs before every request. Use it for auth checks and rate limiting:
```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.redirect('/login');
}
export const config = { matcher: ['/(dashboard)/:path*'] };
```

---

## How Each Piece Connects

```
Open-Meteo API ──→ Cron Job ──→ Solar Model ──→ Postgres
                                                    │
Simulated SCADA ─→ Cron Job ──→ Grid Snapshot ──→ Postgres
                                                    │
                                     Supabase Realtime (WebSocket)
                                                    │
                                                    ▼
                                              Zustand Store
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              ▼                     ▼                     ▼
                          KPI Bar              Map Markers          Alerts Feed
                       Generation Panel     Transmission Lines    Market Price
                       Grid Health          Battery Table         Demand Chart
```

Every iteration adds a new piece to this pipeline. By Iteration 5, data flows end-to-end. Iterations 6–10 add more UI, more features, and production hardening.

---

## Iteration 11 — Global Expansion

Expand coverage from US-only to worldwide. The core architecture (PostGIS, Mapbox, Open-Meteo, GeoJSON, PyPSA) is already location-agnostic — this iteration removes the US-specific assumptions layered on top.

### Current US-Specific Dependencies
- **Seed data:** 20 US power plants, US regions (WECC, ERCOT, MISO, NYISO, SERC)
- **Schema:** `frequency_hz` defaults to 60 Hz (Europe/Asia/Africa use 50 Hz)
- **Map:** Hardcoded `US_CENTER [-98.5, 39.5]` and US zoom levels in `GridMap.tsx`
- **Demo page:** SVG is a US landmass outline with US city labels
- **Coordinate display:** Hardcoded `°W` suffix in `MapPageClient.tsx` — fails for Eastern Hemisphere
- **Demand model (Iteration 8):** Planned hourly profiles are US-shaped
- **Interconnect flow:** References "West→East", "ERCOT", "Canada" in demo

### Step 1 — Multi-Region Data Model
- Add a `grid_regions` reference table: name, country ISO code, nominal frequency (50/60 Hz), currency, timezone, map center/zoom defaults
- Change `generation_nodes.region` to reference `grid_regions` (or use country ISO codes alongside the existing free-text field)
- Make `frequency_hz` default dynamic per region rather than hardcoded 60

### Step 2 — Global Seed Data
- Expand `seed-nodes.ts` to include international plants: European offshore wind (Hornsea, Dogger Bank), Chinese solar (Tengger Desert), Brazilian hydro (Itaipu), Indian wind (Muppandal), etc.
- Make the script region-selectable: `npx tsx scripts/seed-nodes.ts --region=global` (or `--region=us`, `--region=eu`)

### Step 3 — Dynamic Map Centering
- Replace hardcoded `US_CENTER` with auto-fit bounds: compute `LngLatBounds` from actual node data and call `map.fitBounds(...)`
- Accept optional `center`/`zoom` props for manual override
- Fix coordinate display in `MapPageClient.tsx` to show N/S and E/W correctly based on sign

### Step 4 — Replace Demo SVG Map
- The hardcoded US SVG in `/demo` should become a Mapbox-based mini-map or a region-agnostic diagram
- Alternatively, keep the US SVG as a legacy reference and make the live `/map` page the canonical global view

### Step 5 — Internationalize Units & Conventions
- Currency display per region (USD, EUR, GBP, CNY, INR, BRL)
- Frequency standards: 50 Hz vs 60 Hz, different stability thresholds
- Voltage standards per region
- Demand scale differs massively: US ~800 GW peak, UK ~40 GW, India ~250 GW, Germany ~80 GW
- Timezone-aware labels in charts and alerts

### Step 6 — Region-Aware Demand Model
- The hourly demand profile (Iteration 8) needs per-region curves — tropical countries have different A/C patterns, industrial nations peak differently, Southern Hemisphere seasons are inverted
- Temperature coefficients vary by climate zone
- Weekend/weekday patterns differ by culture (Friday/Saturday weekend in some Middle East countries)

### Feasibility Notes
**Already global (no work needed):** PostGIS, Mapbox, Open-Meteo, PyPSA, GeoJSON, WebSockets, Supabase
**Moderate effort (~2-3 days):** Schema changes, map auto-centering, coordinate formatting, seed data expansion
**High effort (ongoing):** Realistic demand profiles, market pricing models, and grid data for non-US/EU regions — US (EIA) and EU (ENTSO-E) have excellent open data, but many countries have limited or no public grid data. This is a data sourcing challenge more than a code challenge.

### Concepts You'll Learn

**Data Normalization & Reference Tables**
Instead of scattering region-specific constants in code, centralize them in the database. A `grid_regions` table becomes the single source of truth for frequency, currency, timezone — every component reads from it rather than assuming US defaults.

**Responsive Map Viewport (`fitBounds`)**
Instead of hardcoding a center point, compute the bounding box of your data and let Mapbox frame it:
```js
const bounds = new mapboxgl.LngLatBounds();
nodes.forEach(n => bounds.extend([n.lng, n.lat]));
map.fitBounds(bounds, { padding: 40 });
```
This works for 20 nodes in Texas or 200 nodes across 6 continents.

**Internationalization (i18n) Patterns**
Formatting numbers, currencies, and dates for different locales using `Intl.NumberFormat` and `Intl.DateTimeFormat` — built into every modern browser, no library needed:
```js
new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(142)
// → "142,00 €"
```
