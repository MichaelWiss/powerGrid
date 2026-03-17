# US Renewable Grid Command Center

A real-time operations dashboard for monitoring renewable energy generation, grid health, and market conditions across the US power grid.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4)

## Overview

The Grid Command Center provides a single-pane-of-glass view for grid operators, featuring:

- **KPI bar** — Total demand, renewable generation, grid balance, curtailment, CO₂ intensity
- **Generation panel** — Real-time output bars for solar, wind, hydro, battery, and gas sources
- **Grid health** — Frequency, synthetic inertia, reserve margin, voltage, ramp rate, TX load
- **Interconnect flow** — West→East, ERCOT, and Canada power transfers
- **Interactive map** — 20 US power plants as color-coded Mapbox markers with click-to-inspect
- **Battery storage table** — State of charge, dispatch, and revenue per region
- **Alerts feed** — Severity-colored alerts with timestamps
- **Market price** — Current $/MWh with delta and carbon credit info
- **Demand forecast** — 24-hour outlook with peak warnings
- **Scenario engine** — What-if simulation buttons (cascade failure, cloud front, demand spike, battery optimize)
- **Asset health** — Underperforming asset counts and maintenance queue

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Server & Client Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with CSS custom properties
- **Map**: [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- **Charts**: [Chart.js](https://www.chartjs.org/) + react-chartjs-2
- **State**: [Zustand](https://zustand.docs.pmnd.rs/) (global store for real-time data)
- **Database**: [Supabase](https://supabase.com/) (Postgres + Realtime)
- **Font**: Geist (via `next/font`)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Mapbox access token](https://account.mapbox.com/access-tokens/)
- (Optional) A Supabase project — the app runs with mock data by default

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# Optional — only needed when connecting to Supabase
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (dashboard)/          # Route group — shared layout, no URL prefix
    page.tsx            # / — Command Center (main dashboard)
    layout.tsx          # Header, nav, footer shell + live UTC clock
    DashboardMap.tsx    # Compact embedded map component
    map/                # /map — Full-screen operations map
    assets/             # /assets — Asset management (placeholder)
    batteries/          # /batteries — Battery storage (placeholder)
    scenarios/          # /scenarios — Simulation runner (placeholder)
    forecast/           # /forecast — Demand forecasting (placeholder)
    analytics/          # /analytics — Historical charts (placeholder)
components/
  GridMap.tsx           # Reusable Mapbox map with data-driven markers
  RealtimeProvider.tsx  # Hydrates Zustand store (mock data now, Supabase Realtime later)
lib/
  store.ts             # Zustand store (nodes, snapshots, alerts)
  mockData.ts          # 20 generation nodes, grid snapshot, 5 alerts
  supabase/            # Supabase client helpers
_reference/
  us_renewable_grid_command_center.html  # Visual design reference
```

## Data Flow

```
Mock Data (lib/mockData.ts)
  │
  ▼
RealtimeProvider (hydrates store on mount)
  │
  ▼
Zustand Store (nodes, latestSnapshot, alerts)
  │
  ├── KPI Bar          reads snapshot
  ├── Generation Panel  reads snapshot
  ├── Grid Health       reads snapshot
  ├── Map Markers       reads nodes
  ├── Alerts Feed       reads alerts
  └── Market Price      reads snapshot
```

In a future iteration, `RealtimeProvider` will open a Supabase Realtime WebSocket subscription instead of loading mock data. All downstream components remain unchanged.

## Database Schema

Supabase Postgres with PostGIS. GIST indexes on all geography columns, DESC indexes on time columns, partial index on `alerts WHERE acknowledged = false`.

```
generation_nodes                transmission_lines
─────────────────               ──────────────────
id                              id
name                            from_bus, to_bus
type (solar/wind/hydro/         capacity_mw
      battery/gas)              current_load_mw
location (GEOGRAPHY)            load_pct
capacity_mw                     status (normal/congested/critical)
current_output_mw               from_coords, to_coords
status (online/offline/
        degraded/maintenance)
efficiency_pct                  alerts
region                          ──────
                                id, severity, message
grid_snapshots                  node_id (FK), region
──────────────                  acknowledged, created_at
time (TIMESTAMPTZ)
total_demand_gw                 battery_storage
renewable_gen_gw                ───────────────
grid_balance_gw                 id, name, region
curtailment_gw                  location (GEOGRAPHY)
co2_intensity                   capacity_mwh
market_price_mwh                current_soc_pct
frequency_hz                    current_dispatch_mw
reserve_margin_gw               status
synthetic_inertia_pct
ramp_rate_mw_min                simulation_runs
solar_gw, wind_gw,              ───────────────
hydro_gw, gas_gw                id, scenario_type
                                params (JSONB)
solar_forecasts                 result (JSONB)
demand_forecasts                status, started_at
market_data
asset_health
```

## System Architecture

Full architecture is documented in [`_reference/grid_command_ascii_schematic.html`](./_reference/grid_command_ascii_schematic.html). The target system has 8 layers:

```
Layer 1: External Data Sources
  Open-Meteo API → weather/solar    Simulated SCADA → grid telemetry    Market Feed → prices
        │                                  │                                  │
        └──────────────────────────────────┴──────────────────────────────────┘
                                           │
                                           ▼
Layer 2: Next.js API Routes
  /api/ingest/weather    /api/ingest/grid    /api/market    /api/simulate    /api/alerts
                                           │
                                           ▼
Layer 3: Kafka Event Bus (Confluent Cloud)
  Topics: grid.snapshots, grid.node-status, forecast.solar, forecast.demand,
          alerts.new, alerts.resolved, battery.commands, battery.status,
          market.prices, simulation.requests, simulation.results
                                           │
                                           ▼
Layer 4: Storage
  Supabase Postgres (PostGIS)  +  Upstash Redis (hot cache for SSE reads)
                                           │
                                           ▼
Layer 5: Python Microservice (Render)
  FastAPI + PyPSA power flow solver — cascade failure, demand spike, battery optimization
                                           │
                                           ▼
Layer 6: Next.js Frontend
  Zustand store ← SSE stream ← Redis ← Kafka consumers
  Pages: / (command center), /map, /scenarios, /forecast, /batteries, /assets, /analytics
                                           │
                                           ▼
Layer 7: Analytics — Apache Superset (direct Postgres connection)
Layer 8: Background Jobs — GitHub Actions crons (weather, demand, asset scoring, pruning)
```

> **Current state:** Layers 4 (Postgres schema) and 6 (frontend) are partially built. The app runs on mock data with Zustand. Kafka, Redis, Python service, Superset, and crons are planned for future iterations.

## Learning Plan

This project follows an 11-iteration curriculum documented in [`LEARNING_PLAN.md`](./LEARNING_PLAN.md). Current progress:

| # | Iteration | Status |
|---|-----------|--------|
| 1 | Routing & Layout | ✅ Complete |
| 2 | Supabase & Seed Data | ✅ Complete |
| 3 | The Map | ✅ Complete |
| 4 | Real-Time with Zustand | ✅ Complete |
| 5 | SCADA Simulator & Cron | Planned |
| 6 | KPI Bar & Dashboard Panels | 🔧 In Progress |
| 7 | Server Actions & Mutations | Planned |
| 8 | Weather & Forecast | Planned |
| 9 | Python Simulation Service | Planned |
| 10 | Analytics, Auth & Polish | Planned |
| 11 | Global Expansion | Planned |

## License

MIT
