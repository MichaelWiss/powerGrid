-- ═══════════════════════════════════════════════════════════════════
-- GRID COMMAND CENTER — Database Schema
-- ═══════════════════════════════════════════════════════════════════
-- This file documents the full schema. In practice, each table
-- will be created as a separate Supabase migration file.
--
-- HOW TO USE:
-- Option A: Paste into Supabase SQL Editor (dashboard)
-- Option B: Use Supabase CLI migrations (recommended, we'll set up later)
--
-- CONCEPTS TO LEARN:
-- 1. PostGIS GEOGRAPHY type — stores lat/lng, enables proximity queries
-- 2. TIMESTAMPTZ — timestamp with timezone, always use this over TIMESTAMP
-- 3. JSONB — flexible JSON storage for simulation params/results
-- 4. Partial indexes — index only rows matching a condition (faster)
-- 5. RLS (Row Level Security) — database-level access control
-- ═══════════════════════════════════════════════════════════════════

-- Enable PostGIS for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 1. GENERATION NODES ─────────────────────────────────────────
-- Each row is a power plant or generation facility on the grid.
-- 20 real US locations will be seeded.
CREATE TABLE generation_nodes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('solar', 'wind', 'hydro', 'gas', 'battery')),
  location       GEOGRAPHY(POINT, 4326) NOT NULL,
  capacity_mw    NUMERIC NOT NULL,
  current_output_mw NUMERIC NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'degraded', 'maintenance')),
  efficiency_pct NUMERIC NOT NULL DEFAULT 95,
  region         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. TRANSMISSION LINES ───────────────────────────────────────
-- Connections between grid nodes. Each line has a capacity and current load.
CREATE TABLE transmission_lines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  from_node_id   UUID NOT NULL REFERENCES generation_nodes(id),
  to_node_id     UUID NOT NULL REFERENCES generation_nodes(id),
  capacity_mw    NUMERIC NOT NULL,
  current_load_mw NUMERIC NOT NULL DEFAULT 0,
  load_pct       NUMERIC GENERATED ALWAYS AS (
    CASE WHEN capacity_mw > 0 THEN (current_load_mw / capacity_mw) * 100 ELSE 0 END
  ) STORED,
  status         TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'congested', 'critical', 'offline')),
  from_coords    GEOGRAPHY(POINT, 4326) NOT NULL,
  to_coords      GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. GRID SNAPSHOTS ───────────────────────────────────────────
-- Point-in-time snapshot of the entire grid state.
-- One row inserted every ~30 seconds by the SCADA ingestion cron.
-- This is the highest-volume table — pruned to 30 days.
CREATE TABLE grid_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_demand_gw       NUMERIC NOT NULL,
  renewable_gen_gw      NUMERIC NOT NULL,
  grid_balance_gw       NUMERIC NOT NULL,
  curtailment_gw        NUMERIC NOT NULL DEFAULT 0,
  co2_intensity         NUMERIC NOT NULL,
  market_price_mwh      NUMERIC NOT NULL,
  frequency_hz          NUMERIC NOT NULL DEFAULT 60.00,
  reserve_margin_gw     NUMERIC NOT NULL DEFAULT 0,
  synthetic_inertia_pct NUMERIC NOT NULL DEFAULT 0,
  ramp_rate_mw_min      NUMERIC NOT NULL DEFAULT 0,
  solar_gw              NUMERIC NOT NULL DEFAULT 0,
  wind_gw               NUMERIC NOT NULL DEFAULT 0,
  hydro_gw              NUMERIC NOT NULL DEFAULT 0,
  battery_gw            NUMERIC NOT NULL DEFAULT 0,
  gas_gw                NUMERIC NOT NULL DEFAULT 0
);

-- ─── 4. ALERTS ───────────────────────────────────────────────────
-- Grid alerts: outages, congestion warnings, forecast warnings.
CREATE TABLE alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity       TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message        TEXT NOT NULL,
  node_id        UUID REFERENCES generation_nodes(id),
  region         TEXT,
  acknowledged   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ
);

-- ─── 5. BATTERY STORAGE ──────────────────────────────────────────
-- Grid-scale battery assets. SoC and dispatch updated in real-time.
CREATE TABLE battery_storage (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  region               TEXT NOT NULL,
  location             GEOGRAPHY(POINT, 4326) NOT NULL,
  capacity_mwh         NUMERIC NOT NULL,
  current_soc_pct      NUMERIC NOT NULL DEFAULT 50,
  current_dispatch_mw  NUMERIC NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('charging', 'discharging', 'idle', 'offline')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. SOLAR FORECASTS ──────────────────────────────────────────
CREATE TABLE solar_forecasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id     UUID NOT NULL REFERENCES generation_nodes(id),
  forecast_time TIMESTAMPTZ NOT NULL,
  predicted_mw  NUMERIC NOT NULL,
  ghi_wm2     NUMERIC,
  cloud_cover_pct NUMERIC,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 7. DEMAND FORECASTS ─────────────────────────────────────────
CREATE TABLE demand_forecasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_time TIMESTAMPTZ NOT NULL,
  predicted_gw  NUMERIC NOT NULL,
  temperature_c NUMERIC,
  confidence_low_gw  NUMERIC,
  confidence_high_gw NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 8. MARKET DATA ──────────────────────────────────────────────
CREATE TABLE market_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time            TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_mwh       NUMERIC NOT NULL,
  carbon_credit   NUMERIC NOT NULL DEFAULT 0,
  curtailment_cost NUMERIC NOT NULL DEFAULT 0
);

-- ─── 9. SIMULATION RUNS ──────────────────────────────────────────
CREATE TABLE simulation_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_type  TEXT NOT NULL CHECK (scenario_type IN (
    'outage', 'cascade_failure', 'demand_spike', 'weather_event', 'battery_dispatch'
  )),
  params         JSONB NOT NULL DEFAULT '{}',
  result         JSONB,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

-- ─── 10. ASSET HEALTH ─────────────────────────────────────────────
CREATE TABLE asset_health (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id         UUID NOT NULL REFERENCES generation_nodes(id),
  anomaly_score   NUMERIC NOT NULL DEFAULT 0,
  expected_output_mw NUMERIC NOT NULL,
  actual_output_mw   NUMERIC NOT NULL,
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

-- Fast "latest snapshot" queries (most recent first)
CREATE INDEX idx_grid_snapshots_time ON grid_snapshots (time DESC);

-- Fast alert feed (unacknowledged alerts, newest first)
CREATE INDEX idx_alerts_active ON alerts (created_at DESC) WHERE acknowledged = false;

-- Forecast lookups by time range
CREATE INDEX idx_solar_forecasts_time ON solar_forecasts (forecast_time DESC);
CREATE INDEX idx_demand_forecasts_time ON demand_forecasts (forecast_time DESC);

-- Market data chronological
CREATE INDEX idx_market_data_time ON market_data (time DESC);

-- Asset health by node
CREATE INDEX idx_asset_health_node ON asset_health (node_id, scored_at DESC);

-- Geographic proximity queries
CREATE INDEX idx_generation_nodes_location ON generation_nodes USING GIST (location);
CREATE INDEX idx_battery_storage_location ON battery_storage USING GIST (location);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════
-- Enable RLS on all tables. By default, no one can access anything.
-- Then we add policies to allow reads for authenticated users
-- and writes only from the service role (used by our API routes).

ALTER TABLE generation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmission_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE grid_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE battery_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_health ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for now — tighten later with auth)
CREATE POLICY "Allow public read" ON generation_nodes FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON transmission_lines FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON grid_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON alerts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON battery_storage FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON solar_forecasts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON demand_forecasts FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON market_data FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON simulation_runs FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON asset_health FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════════════════════════
-- Supabase Realtime listens to Postgres changes via logical replication.
-- Adding tables here means INSERTs/UPDATEs will push to connected browsers.

ALTER PUBLICATION supabase_realtime ADD TABLE grid_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE generation_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE battery_storage;
ALTER PUBLICATION supabase_realtime ADD TABLE market_data;
ALTER PUBLICATION supabase_realtime ADD TABLE simulation_runs;
