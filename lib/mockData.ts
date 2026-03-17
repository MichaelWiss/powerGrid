/*
  MOCK DATA FOR ITERATION 4
  ──────────────────────────
  First-render fallback data shaped like Supabase payloads for the
  three tables Iteration 4 touches: grid_snapshots, generation_nodes, alerts.
*/

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

// generation_nodes (20 plants from Iteration 2 seed data)
export const MOCK_NODES: MockGenerationNode[] = [
  { id: "node-solar-1", name: "Solar Star (Rosamond, CA)", type: "solar", capacity_mw: 579, current_output_mw: 412, lat: 34.85, lng: -118.25, region: "WECC", status: "online", efficiency_pct: 92 },
  { id: "node-solar-2", name: "Topaz Solar Farm (San Luis Obispo, CA)", type: "solar", capacity_mw: 550, current_output_mw: 380, lat: 35.04, lng: -119.98, region: "WECC", status: "online", efficiency_pct: 92 },
  { id: "node-solar-3", name: "Desert Sunlight (Desert Center, CA)", type: "solar", capacity_mw: 550, current_output_mw: 485, lat: 33.83, lng: -115.31, region: "WECC", status: "online", efficiency_pct: 92 },
  { id: "node-solar-4", name: "Copper Mountain Solar (Boulder City, NV)", type: "solar", capacity_mw: 458, current_output_mw: 310, lat: 35.80, lng: -114.98, region: "WECC", status: "online", efficiency_pct: 92 },
  { id: "node-solar-5", name: "Villanueva Solar (Viesca, TX)", type: "solar", capacity_mw: 828, current_output_mw: 590, lat: 25.35, lng: -102.80, region: "ERCOT", status: "online", efficiency_pct: 92 },
  { id: "node-wind-1", name: "Alta Wind Energy Center (Tehachapi, CA)", type: "wind", capacity_mw: 1548, current_output_mw: 1120, lat: 35.08, lng: -118.37, region: "WECC", status: "online", efficiency_pct: 95 },
  { id: "node-wind-2", name: "Shepherds Flat (Arlington, OR)", type: "wind", capacity_mw: 845, current_output_mw: 680, lat: 45.55, lng: -120.17, region: "WECC", status: "online", efficiency_pct: 95 },
  { id: "node-wind-3", name: "Roscoe Wind Farm (Roscoe, TX)", type: "wind", capacity_mw: 782, current_output_mw: 610, lat: 32.45, lng: -100.53, region: "ERCOT", status: "online", efficiency_pct: 95 },
  { id: "node-wind-4", name: "Horse Hollow Wind (Taylor County, TX)", type: "wind", capacity_mw: 736, current_output_mw: 520, lat: 32.30, lng: -99.90, region: "ERCOT", status: "online", efficiency_pct: 95 },
  { id: "node-wind-5", name: "Fowler Ridge (Benton County, IN)", type: "wind", capacity_mw: 600, current_output_mw: 480, lat: 40.55, lng: -87.32, region: "MISO", status: "online", efficiency_pct: 95 },
  { id: "node-hydro-1", name: "Grand Coulee Dam (WA)", type: "hydro", capacity_mw: 6809, current_output_mw: 4200, lat: 47.95, lng: -118.98, region: "WECC", status: "online", efficiency_pct: 98 },
  { id: "node-hydro-2", name: "Hoover Dam (NV/AZ)", type: "hydro", capacity_mw: 2080, current_output_mw: 1450, lat: 36.02, lng: -114.74, region: "WECC", status: "online", efficiency_pct: 98 },
  { id: "node-hydro-3", name: "Robert Moses Niagara (NY)", type: "hydro", capacity_mw: 2525, current_output_mw: 1800, lat: 43.13, lng: -79.04, region: "NYISO", status: "online", efficiency_pct: 98 },
  { id: "node-hydro-4", name: "Chief Joseph Dam (WA)", type: "hydro", capacity_mw: 2620, current_output_mw: 1950, lat: 47.99, lng: -119.63, region: "WECC", status: "online", efficiency_pct: 98 },
  { id: "node-gas-1", name: "West County Energy Center (FL)", type: "gas", capacity_mw: 3750, current_output_mw: 2100, lat: 26.72, lng: -80.28, region: "SERC", status: "online", efficiency_pct: 98 },
  { id: "node-gas-2", name: "Panda Temple Power (Temple, TX)", type: "gas", capacity_mw: 758, current_output_mw: 420, lat: 31.10, lng: -97.34, region: "ERCOT", status: "maintenance", efficiency_pct: 98 },
  { id: "node-gas-3", name: "Calpine Deer Park (Houston, TX)", type: "gas", capacity_mw: 1017, current_output_mw: 780, lat: 29.71, lng: -95.13, region: "ERCOT", status: "online", efficiency_pct: 98 },
  { id: "node-battery-1", name: "Moss Landing BESS (Monterey, CA)", type: "battery", capacity_mw: 400, current_output_mw: 150, lat: 36.81, lng: -121.79, region: "WECC", status: "online", efficiency_pct: 90 },
  { id: "node-battery-2", name: "Vistra Midlothian BESS (TX)", type: "battery", capacity_mw: 260, current_output_mw: -80, lat: 32.47, lng: -97.00, region: "ERCOT", status: "online", efficiency_pct: 90 },
  { id: "node-battery-3", name: "Gateway BESS (San Diego, CA)", type: "battery", capacity_mw: 250, current_output_mw: 0, lat: 32.78, lng: -117.10, region: "WECC", status: "online", efficiency_pct: 90 },
];

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

