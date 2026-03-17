/*
  MOCK DATA
  ──────────────────────────
  First-render fallback data shaped like Supabase payloads for the
  three tables: grid_snapshots, generation_nodes, alerts.

  Nodes are loaded from data/eia-plants.json (5,200+ real US plants from
  the EIA API). If that file is missing, falls back to 20 hand-written plants.
*/

import eiaData from "@/data/eia-plants.json";

export interface MockGridSnapshot {
  id: string;
  time: string;
  total_demand_gw: number;
  renewable_gen_gw: number;
  grid_balance_gw: number;
  curtailment_gw: number;
  co2_intensity: number;
  market_price_mwh: number;
  solar_gw: number;
  wind_gw: number;
  hydro_gw: number;
  battery_gw: number;
  gas_gw: number;
  frequency_hz: number;
  voltage_pu: number;
  reserve_margin_gw: number;
  synthetic_inertia_pct: number;
  ramp_rate_mw_min: number;
}

export interface MockGenerationNode {
  id: string;
  name: string;
  type: "solar" | "wind" | "hydro" | "gas" | "battery";
  capacity_mw: number;
  current_output_mw: number;
  lat: number;
  lng: number;
  region: string;
  status: "online" | "offline" | "degraded" | "maintenance";
  efficiency_pct: number;
}

export interface MockAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  node_id: string | null;
  region: string | null;
  acknowledged: boolean;
  created_at: string;
  acknowledged_at: string | null;
}

// grid_snapshots (one row is enough for first render)
export const MOCK_SNAPSHOT: MockGridSnapshot = {
  id: "snapshot-mock-001",
  time: new Date().toISOString(),
  total_demand_gw: 82.4,
  renewable_gen_gw: 76.8,
  grid_balance_gw: 5.6,
  curtailment_gw: 1.2,
  co2_intensity: 114,
  market_price_mwh: 42.7,
  solar_gw: 42.3,
  wind_gw: 87.1,
  hydro_gw: 24.0,
  battery_gw: 6.8,
  gas_gw: 5.9,
  frequency_hz: 60.01,
  voltage_pu: 1.0,
  reserve_margin_gw: 6.1,
  synthetic_inertia_pct: 72,
  ramp_rate_mw_min: 420,
};

// generation_nodes — loaded from EIA cached data (5,200+ real US plants)
export const MOCK_NODES: MockGenerationNode[] = (eiaData.plants as MockGenerationNode[]);

// alerts (one or two rows is enough)
export const MOCK_ALERTS: MockAlert[] = [
  {
    id: "a1",
    severity: "warning",
    message: "Line B-C approaching capacity",
    node_id: null,
    region: "WECC",
    acknowledged: false,
    created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    acknowledged_at: null,
  },
  {
    id: "a2",
    severity: "info",
    message: "Solar output ramping down in WECC",
    node_id: null,
    region: "WECC",
    acknowledged: false,
    created_at: new Date(Date.now() - 8 * 60_000).toISOString(),
    acknowledged_at: null,
  },
  {
    id: "a3",
    severity: "critical",
    message: "Frequency dipped to 59.95 Hz in ERCOT",
    node_id: null,
    region: "ERCOT",
    acknowledged: false,
    created_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    acknowledged_at: null,
  },
  {
    id: "a4",
    severity: "warning",
    message: "TX Wind Farm B output −22% below forecast",
    node_id: "node-wind-3",
    region: "ERCOT",
    acknowledged: false,
    created_at: new Date(Date.now() - 18 * 60_000).toISOString(),
    acknowledged_at: null,
  },
  {
    id: "a5",
    severity: "info",
    message: "Battery dispatch optimized for evening peak",
    node_id: "node-battery-1",
    region: "WECC",
    acknowledged: false,
    created_at: new Date(Date.now() - 25 * 60_000).toISOString(),
    acknowledged_at: null,
  },
];

