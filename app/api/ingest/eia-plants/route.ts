/*
  EIA PLANT INGESTION ROUTE
  ─────────────────────────
  POST /api/ingest/eia-plants
  Refreshes the cached EIA plant data from the live API.

  Protected by CRON_SECRET header — designed to be called by a cron job
  or manually for data refresh.

  Query params:
    ?minMw=10  — minimum plant capacity (default: 10)
*/

import { NextRequest, NextResponse } from "next/server";
import { writeFileSync } from "fs";
import { resolve } from "path";

const API_BASE = "https://api.eia.gov/v2/electricity/operating-generator-capacity/data/";
const PAGE_SIZE = 5000;

const FUEL_MAP: Record<string, string> = {
  SUN: "solar",
  WND: "wind",
  WAT: "hydro",
  NG: "gas",
  MWH: "battery",
};

interface EIARow {
  plantid: string;
  plantName: string;
  stateid: string;
  stateName: string;
  energy_source_code: string;
  balancing_authority_code: string;
  "nameplate-capacity-mw": string;
  latitude: string;
  longitude: string;
}

async function fetchPage(apiKey: string, fuelCode: string, offset: number) {
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
    start: "2025-12",
    end: "2025-12",
  });

  const res = await fetch(`${API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`EIA API: ${res.status}`);
  const json = await res.json();
  return {
    rows: (json.response?.data ?? []) as EIARow[],
    total: parseInt(json.response?.total ?? "0", 10),
  };
}

export async function POST(request: NextRequest) {
  // Auth check
  const secret = request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "EIA_API_KEY not configured" }, { status: 500 });
  }

  const minMw = parseInt(request.nextUrl.searchParams.get("minMw") ?? "10", 10);
  const fuelCodes = Object.keys(FUEL_MAP);
  const allPlants: Record<string, unknown>[] = [];

  for (const fuelCode of fuelCodes) {
    const type = FUEL_MAP[fuelCode];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const page = await fetchPage(apiKey, fuelCode, offset);
      total = page.total;

      // Deduplicate by plantid, aggregate capacity
      const plantMap = new Map<string, Record<string, unknown>>();
      for (const row of page.rows) {
        const mw = parseFloat(row["nameplate-capacity-mw"]);
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);
        if (!mw || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;

        const existing = plantMap.get(row.plantid);
        if (existing) {
          (existing as { capacity_mw: number }).capacity_mw += mw;
        } else {
          plantMap.set(row.plantid, {
            id: `eia-${type}-${row.plantid}`,
            name: `${row.plantName} (${row.stateName})`,
            type,
            capacity_mw: mw,
            current_output_mw: 0,
            lat,
            lng,
            region: row.balancing_authority_code,
            status: "online",
            efficiency_pct: type === "hydro" ? 90 : type === "solar" ? 22 : type === "wind" ? 35 : type === "gas" ? 55 : 85,
            state: row.stateid,
            eia_plant_id: row.plantid,
            balancing_authority: row.balancing_authority_code,
          });
        }
      }

      for (const plant of plantMap.values()) {
        if ((plant as { capacity_mw: number }).capacity_mw >= minMw) {
          allPlants.push(plant);
        }
      }

      offset += PAGE_SIZE;
      if (page.rows.length > 0) {
        const smallest = parseFloat(page.rows[page.rows.length - 1]["nameplate-capacity-mw"]);
        if (smallest < minMw) break;
      }
      if (page.rows.length < PAGE_SIZE) break;
    }
  }

  // Write cached file
  const outPath = resolve(process.cwd(), "data/eia-plants.json");
  writeFileSync(
    outPath,
    JSON.stringify({
      generated_at: new Date().toISOString(),
      min_capacity_mw: minMw,
      total: allPlants.length,
      plants: allPlants,
    }),
  );

  return NextResponse.json({
    success: true,
    total: allPlants.length,
    generated_at: new Date().toISOString(),
  });
}
