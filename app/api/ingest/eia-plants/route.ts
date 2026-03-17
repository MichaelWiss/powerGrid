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
const FETCH_TIMEOUT_MS = 15000;
const MAX_PAGES_PER_FUEL = 50;

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

function simulateOutput(type: string, capacityMw: number): number {
  const cf =
    type === "solar" ? 0.15 + Math.random() * 0.15 :
    type === "wind" ? 0.25 + Math.random() * 0.15 :
    type === "hydro" ? 0.35 + Math.random() * 0.25 :
    type === "gas" ? 0.4 + Math.random() * 0.3 :
    type === "battery" ? -0.2 + Math.random() * 0.6 :
    0.5;

  return Math.round(capacityMw * cf);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const res = await fetch(`${API_BASE}?${params.toString()}`, { signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
  if (!res.ok) throw new Error(`EIA API: ${res.status}`);
  const json = await res.json();
  return {
    rows: (json.response?.data ?? []) as EIARow[],
    total: parseInt(json.response?.total ?? "0", 10),
  };
}

export async function POST(request: NextRequest) {
  // Auth check — header only; avoid query-param to keep secret out of server logs
  const secret = request.headers.get("x-cron-secret");
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
    let pagesFetched = 0;
    const plantMap = new Map<string, Record<string, unknown>>();

    while (offset < total) {
      if (pagesFetched >= MAX_PAGES_PER_FUEL) {
        return NextResponse.json(
          { error: `Aborted ingest for ${fuelCode}: exceeded ${MAX_PAGES_PER_FUEL} pages` },
          { status: 502 },
        );
      }

      const page = await fetchPage(apiKey, fuelCode, offset);
      total = page.total;
      pagesFetched += 1;

      // Deduplicate by plantid, aggregate capacity
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

      offset += PAGE_SIZE;
      if (page.rows.length > 0) {
        const smallest = parseFloat(page.rows[page.rows.length - 1]["nameplate-capacity-mw"]);
        if (smallest < minMw) break;
      }
      if (page.rows.length < PAGE_SIZE) break;
    }

    for (const plant of plantMap.values()) {
      const typedPlant = plant as { capacity_mw: number; current_output_mw: number };
      if (typedPlant.capacity_mw >= minMw) {
        typedPlant.current_output_mw = simulateOutput(type, typedPlant.capacity_mw);
        allPlants.push(typedPlant);
      }
    }
  }

  // Write cached file
  // NOTE: writeFileSync only succeeds when the server has a writable filesystem
  // (local dev / persistent server). In read-only serverless environments
  // (Vercel, etc.) this will return a 500 with a clear message rather than crash.
  const outPath = resolve(process.cwd(), "data/eia-plants.json");
  try {
    writeFileSync(
      outPath,
      JSON.stringify({
        generated_at: new Date().toISOString(),
        min_capacity_mw: minMw,
        total: allPlants.length,
        plants: allPlants,
      }),
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to write cache file — filesystem may be read-only", detail: String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    total: allPlants.length,
    generated_at: new Date().toISOString(),
  });
}
