/*
  SEED SCRIPT — generation_nodes
  ───────────────────────────────
  Inserts 20 real US power plant / generation facility locations
  into the generation_nodes table using the service-role client.

  Run with:
    npx tsx scripts/seed-nodes.ts

  Prerequisites:
    - .env.local exists with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    - Schema has been applied to your Supabase project (supabase/schema.sql)

  CONCEPTS:
    - We use createClient directly (not the lib/ wrappers) so the script
      is self-contained and doesn't depend on Next.js runtime.
    - PostGIS expects coordinates as "POINT(lng lat)" — note longitude first.
    - The service_role key bypasses RLS so we can INSERT.
*/

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local manually (no Next.js runtime here) ──────────
const envPath = resolve(process.cwd(), ".env.local");
const envVars: Record<string, string> = {};
try {
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    envVars[key] = val;
  }
} catch {
  console.error("❌ Could not read .env.local — make sure it exists.");
  process.exit(1);
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── 20 Real US Generation Facilities ─────────────────────────────
// Coordinates are [longitude, latitude] — PostGIS convention.
const NODES = [
  // SOLAR
  { name: "Solar Star (Rosamond, CA)",         type: "solar",   lng: -118.25, lat: 34.85, capacity_mw: 579,  region: "WECC" },
  { name: "Topaz Solar Farm (San Luis Obispo, CA)", type: "solar", lng: -119.98, lat: 35.04, capacity_mw: 550, region: "WECC" },
  { name: "Desert Sunlight (Desert Center, CA)", type: "solar", lng: -115.31, lat: 33.83, capacity_mw: 550,  region: "WECC" },
  { name: "Copper Mountain Solar (Boulder City, NV)", type: "solar", lng: -114.98, lat: 35.80, capacity_mw: 458, region: "WECC" },
  { name: "Villanueva Solar (Viesca, TX)",     type: "solar",   lng: -102.80, lat: 25.35, capacity_mw: 828,  region: "ERCOT" },

  // WIND
  { name: "Alta Wind Energy Center (Tehachapi, CA)", type: "wind", lng: -118.37, lat: 35.08, capacity_mw: 1548, region: "WECC" },
  { name: "Shepherds Flat (Arlington, OR)",    type: "wind",    lng: -120.17, lat: 45.55, capacity_mw: 845,  region: "WECC" },
  { name: "Roscoe Wind Farm (Roscoe, TX)",     type: "wind",    lng: -100.53, lat: 32.45, capacity_mw: 782,  region: "ERCOT" },
  { name: "Horse Hollow Wind (Taylor County, TX)", type: "wind", lng: -99.90, lat: 32.30, capacity_mw: 736,  region: "ERCOT" },
  { name: "Fowler Ridge (Benton County, IN)",  type: "wind",    lng: -87.32,  lat: 40.55, capacity_mw: 600,  region: "MISO" },

  // HYDRO
  { name: "Grand Coulee Dam (WA)",             type: "hydro",   lng: -118.98, lat: 47.95, capacity_mw: 6809, region: "WECC" },
  { name: "Hoover Dam (NV/AZ)",                type: "hydro",   lng: -114.74, lat: 36.02, capacity_mw: 2080, region: "WECC" },
  { name: "Robert Moses Niagara (NY)",         type: "hydro",   lng: -79.04,  lat: 43.13, capacity_mw: 2525, region: "NYISO" },
  { name: "Chief Joseph Dam (WA)",             type: "hydro",   lng: -119.63, lat: 47.99, capacity_mw: 2620, region: "WECC" },

  // GAS (peaker / backup)
  { name: "West County Energy Center (FL)",    type: "gas",     lng: -80.28,  lat: 26.72, capacity_mw: 3750, region: "SERC" },
  { name: "Panda Temple Power (Temple, TX)",   type: "gas",     lng: -97.34,  lat: 31.10, capacity_mw: 758,  region: "ERCOT" },
  { name: "Calpine Deer Park (Houston, TX)",   type: "gas",     lng: -95.13,  lat: 29.71, capacity_mw: 1017, region: "ERCOT" },

  // BATTERY
  { name: "Moss Landing BESS (Monterey, CA)",  type: "battery", lng: -121.79, lat: 36.81, capacity_mw: 400,  region: "WECC" },
  { name: "Vistra Midlothian BESS (TX)",       type: "battery", lng: -97.00,  lat: 32.47, capacity_mw: 260,  region: "ERCOT" },
  { name: "Gateway BESS (San Diego, CA)",      type: "battery", lng: -117.10, lat: 32.78, capacity_mw: 250,  region: "WECC" },
];

async function seed() {
  console.log("🌱 Seeding generation_nodes...\n");

  // Clear existing rows (idempotent re-runs)
  const { error: deleteError } = await supabase
    .from("generation_nodes")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

  if (deleteError) {
    console.error("⚠️  Could not clear existing rows:", deleteError.message);
  }

  const rows = NODES.map((n) => ({
    name: n.name,
    type: n.type,
    // PostGIS GEOGRAPHY(POINT, 4326) accepts WKT or GeoJSON.
    // Supabase/PostgREST accepts GeoJSON format for geography columns:
    location: `POINT(${n.lng} ${n.lat})`,
    capacity_mw: n.capacity_mw,
    current_output_mw: 0,
    status: "online" as const,
    efficiency_pct: n.type === "solar" ? 92 : n.type === "wind" ? 95 : 98,
    region: n.region,
  }));

  const { data, error } = await supabase
    .from("generation_nodes")
    .insert(rows)
    .select("id, name, type, region, capacity_mw");

  if (error) {
    console.error("❌ Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${data.length} nodes:\n`);
  for (const node of data) {
    console.log(`   ${node.type.padEnd(8)} ${node.name} — ${node.capacity_mw} MW (${node.region})`);
  }
  console.log("\n🎉 Done!");
}

seed();
