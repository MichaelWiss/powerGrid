#!/usr/bin/env npx tsx
/*
  SEED FROM EIA API v2
  ─────────────────────
  Fetches operating US power plants from the EIA's generator capacity dataset,
  deduplicates by plantId (aggregating generators), and writes a cached JSON
  file that the app can load as mock data.

  Usage:
    npx tsx scripts/seed-from-eia.ts               # default: all fuel types, ≥10 MW
    npx tsx scripts/seed-from-eia.ts --min-mw=50    # only plants ≥50 MW

  Requires: EIA_API_KEY in .env.local
  Output:   data/eia-plants.json
*/

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ── Config ────────────────────────────────────────────────────────────

const MIN_CAPACITY_MW = parseInt(process.argv.find((a) => a.startsWith("--min-mw="))?.split("=")[1] ?? "10", 10);
const API_BASE = "https://api.eia.gov/v2/electricity/operating-generator-capacity/data/";
const PAGE_SIZE = 5000; // EIA max per request

// EIA energy source codes → our type taxonomy
const FUEL_MAP: Record<string, string> = {
  SUN: "solar",
  WND: "wind",
  WAT: "hydro",
  NG: "gas",
  MWH: "battery", // grid-scale battery storage
};

// EIA balancing authority → our simplified region names
const BA_TO_REGION: Record<string, string> = {
  // Western
  CISO: "WECC", BPAT: "WECC", NEVP: "WECC", PACE: "WECC", PACW: "WECC",
  PSCO: "WECC", AZPS: "WECC", SRP: "WECC", WACM: "WECC", WALC: "WECC",
  WAUW: "WECC", LDWP: "WECC", TIDC: "WECC", BANC: "WECC", IID: "WECC",
  NWMT: "WECC", AVRN: "WECC", TPWR: "WECC", SCL: "WECC", CHPD: "WECC",
  DOPD: "WECC", GCPD: "WECC", PNM: "WECC", EPE: "WECC", GRIF: "WECC",
  GRIS: "WECC", HGMA: "WECC", WWA: "WECC", DEAA: "WECC", GWA: "WECC",
  GRID: "WECC",
  // Texas
  ERCO: "ERCOT",
  // Midwest
  MISO: "MISO", SWPP: "SPP",
  // Northeast
  NYIS: "NYISO", ISNE: "ISO-NE",
  // Mid-Atlantic
  PJM: "PJM",
  // Southeast
  SOCO: "SERC", DUK: "SERC", FPL: "SERC", FPC: "SERC", TEC: "SERC",
  TAL: "SERC", JEA: "SERC", SEC: "SERC", SCEG: "SERC", SC: "SERC",
  TVA: "SERC", LGEE: "SERC", CPLE: "SERC", CPLW: "SERC", AEC: "SERC",
  AECI: "SERC", EEI: "SERC", GVL: "SERC", HST: "SERC", NSB: "SERC",
  OVEC: "SERC", SERU: "SERC", YAD: "SERC",
};

const FUEL_CODES = Object.keys(FUEL_MAP);

// ── Load API key ──────────────────────────────────────────────────────

function loadApiKey(): string {
  try {
    const envFile = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
    const match = envFile.match(/^EIA_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // fall through
  }
  if (process.env.EIA_API_KEY) return process.env.EIA_API_KEY;
  throw new Error("EIA_API_KEY not found in .env.local or environment");
}

// ── Types ─────────────────────────────────────────────────────────────

interface EIARow {
  period: string;
  plantid: string;
  plantName: string;
  stateid: string;
  stateName: string;
  technology: string;
  energy_source_code: string;
  balancing_authority_code: string;
  status: string;
  "nameplate-capacity-mw": string;
  latitude: string;
  longitude: string;
}

interface PlantNode {
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
  state: string;
  eia_plant_id: string;
  balancing_authority: string;
}

// ── Fetch one page from EIA ───────────────────────────────────────────

async function fetchPage(apiKey: string, fuelCode: string, offset: number): Promise<{ rows: EIARow[]; total: number }> {
  const params = new URLSearchParams({
    api_key: apiKey,
    frequency: "monthly",
    "data[0]": "nameplate-capacity-mw",
    "data[1]": "latitude",
    "data[2]": "longitude",
    "facets[status][]": "OP",
    "facets[energy_source_code][]": fuelCode,
    "sort[0][column]": "nameplate-capacity-mw",
    "sort[0][direction]": "desc",
    offset: String(offset),
    length: String(PAGE_SIZE),
    // Only get the latest period to avoid duplicates
    start: "2025-12",
    end: "2025-12",
  });

  const url = `${API_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EIA API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return {
    rows: json.response?.data ?? [],
    total: parseInt(json.response?.total ?? "0", 10),
  };
}

// ── Deduplicate generators into plants ────────────────────────────────

function deduplicateToPlants(rows: EIARow[], fuelCode: string): PlantNode[] {
  const plantMap = new Map<string, PlantNode>();
  const type = FUEL_MAP[fuelCode] as PlantNode["type"];

  for (const row of rows) {
    const mw = parseFloat(row["nameplate-capacity-mw"]);
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);

    // Skip rows with missing/invalid coordinates or capacity
    if (!mw || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;

    const existing = plantMap.get(row.plantid);
    if (existing) {
      // Aggregate: sum capacity across generators at same plant
      existing.capacity_mw += mw;
    } else {
      const region = BA_TO_REGION[row.balancing_authority_code] ?? row.balancing_authority_code;
      plantMap.set(row.plantid, {
        id: `eia-${type}-${row.plantid}`,
        name: `${row.plantName} (${row.stateName})`,
        type,
        capacity_mw: mw,
        current_output_mw: 0, // will be simulated
        lat,
        lng,
        region,
        status: "online",
        efficiency_pct: type === "hydro" ? 90 : type === "solar" ? 22 : type === "wind" ? 35 : type === "gas" ? 55 : 85,
        state: row.stateid,
        eia_plant_id: row.plantid,
        balancing_authority: row.balancing_authority_code,
      });
    }
  }

  return Array.from(plantMap.values());
}

// ── Simulate current output ───────────────────────────────────────────

function simulateOutput(plants: PlantNode[]): void {
  for (const p of plants) {
    // Capacity factor by type (approximate US averages)
    const cf =
      p.type === "solar" ? 0.15 + Math.random() * 0.15 :   // 15-30%
      p.type === "wind" ? 0.25 + Math.random() * 0.15 :    // 25-40%
      p.type === "hydro" ? 0.35 + Math.random() * 0.25 :   // 35-60%
      p.type === "gas" ? 0.4 + Math.random() * 0.3 :       // 40-70%
      p.type === "battery" ? -0.2 + Math.random() * 0.6 :  // -20% to 40% (charging or discharging)
      0.5;
    p.current_output_mw = Math.round(p.capacity_mw * cf);
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const apiKey = loadApiKey();
  console.log(`EIA Seed Script — min capacity: ${MIN_CAPACITY_MW} MW`);
  console.log(`Fuel types: ${FUEL_CODES.join(", ")}\n`);

  const allPlants: PlantNode[] = [];

  for (const fuelCode of FUEL_CODES) {
    const typeName = FUEL_MAP[fuelCode];
    process.stdout.write(`Fetching ${typeName} (${fuelCode})...`);

    let offset = 0;
    let allRows: EIARow[] = [];
    let total = Infinity;

    while (offset < total) {
      const page = await fetchPage(apiKey, fuelCode, offset);
      total = page.total;
      allRows = allRows.concat(page.rows);
      offset += PAGE_SIZE;

      // If the smallest plant in this page is already below our threshold, stop
      if (page.rows.length > 0) {
        const smallestInPage = parseFloat(page.rows[page.rows.length - 1]["nameplate-capacity-mw"]);
        if (smallestInPage < MIN_CAPACITY_MW) break;
      }
      if (page.rows.length < PAGE_SIZE) break;
    }

    const plants = deduplicateToPlants(allRows, fuelCode).filter((p) => p.capacity_mw >= MIN_CAPACITY_MW);
    allPlants.push(...plants);
    console.log(` ${plants.length} plants (from ${allRows.length} generator rows)`);
  }

  // Simulate current output
  simulateOutput(allPlants);

  // Sort by capacity descending
  allPlants.sort((a, b) => b.capacity_mw - a.capacity_mw);

  // Summary by type
  console.log(`\n── Summary ──`);
  const byType = new Map<string, number>();
  for (const p of allPlants) byType.set(p.type, (byType.get(p.type) ?? 0) + 1);
  for (const [type, count] of byType) console.log(`  ${type}: ${count}`);
  console.log(`  TOTAL: ${allPlants.length} plants`);

  // Write to file
  const outPath = resolve(__dirname, "../data/eia-plants.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        min_capacity_mw: MIN_CAPACITY_MW,
        total: allPlants.length,
        plants: allPlants,
      },
      null,
      2,
    ),
  );
  console.log(`\nWritten to ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
