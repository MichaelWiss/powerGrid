/*
  SEED SCRIPT — transmission_lines
  ──────────────────────────────────
  Inserts ~15 transmission lines connecting existing generation nodes.
  Fetches node IDs + coordinates from the database, then creates
  realistic interconnections between them.

  Run with:
    npx tsx scripts/seed-lines.ts

  Prerequisites:
    - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    - generation_nodes already seeded (run seed-nodes.ts first)
*/

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local manually ─────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
let envVars: Record<string, string> = {};
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

// ── EWKB Point parser (same logic as lib/geo.ts) ────────────────
function parseEWKBPoint(hex: string): { lng: number; lat: number } | null {
  try {
    if (hex.length < 50) return null;
    const xHex = hex.slice(18, 34);
    const yHex = hex.slice(34, 50);
    const lng = hexToFloat64LE(xHex);
    const lat = hexToFloat64LE(yHex);
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
    return { lng, lat };
  } catch {
    return null;
  }
}

function hexToFloat64LE(hex: string): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  bytes.reverse();
  const view = new DataView(bytes.buffer);
  return view.getFloat64(0);
}

// ── Define connections by node name pairs ────────────────────────
// These represent realistic transmission corridors between the seeded plants.
const LINE_DEFINITIONS = [
  // WECC West Coast backbone
  { from: "Grand Coulee Dam (WA)",                to: "Chief Joseph Dam (WA)",             name: "Columbia River Corridor",     capacity_mw: 5000 },
  { from: "Grand Coulee Dam (WA)",                to: "Shepherds Flat (Arlington, OR)",    name: "Pacific NW Link",             capacity_mw: 3000 },
  { from: "Shepherds Flat (Arlington, OR)",        to: "Alta Wind Energy Center (Tehachapi, CA)", name: "OR–CA Intertie",         capacity_mw: 4000 },
  { from: "Alta Wind Energy Center (Tehachapi, CA)", to: "Solar Star (Rosamond, CA)",      name: "Tehachapi–Rosamond",          capacity_mw: 2500 },
  { from: "Solar Star (Rosamond, CA)",             to: "Topaz Solar Farm (San Luis Obispo, CA)", name: "Central CA Solar Link",   capacity_mw: 2000 },
  { from: "Topaz Solar Farm (San Luis Obispo, CA)", to: "Moss Landing BESS (Monterey, CA)", name: "CA Coast Storage Link",      capacity_mw: 1500 },
  { from: "Solar Star (Rosamond, CA)",             to: "Desert Sunlight (Desert Center, CA)", name: "SoCal Solar Corridor",      capacity_mw: 2000 },
  { from: "Desert Sunlight (Desert Center, CA)",   to: "Gateway BESS (San Diego, CA)",     name: "Desert–San Diego",            capacity_mw: 1800 },
  { from: "Desert Sunlight (Desert Center, CA)",   to: "Hoover Dam (NV/AZ)",               name: "Desert–Hoover Link",          capacity_mw: 3000 },
  { from: "Hoover Dam (NV/AZ)",                    to: "Copper Mountain Solar (Boulder City, NV)", name: "NV Solar–Hydro Tie",   capacity_mw: 2500 },

  // ERCOT Texas grid
  { from: "Roscoe Wind Farm (Roscoe, TX)",         to: "Horse Hollow Wind (Taylor County, TX)", name: "West TX Wind Corridor",   capacity_mw: 2000 },
  { from: "Roscoe Wind Farm (Roscoe, TX)",         to: "Panda Temple Power (Temple, TX)",  name: "Wind–Gas Backup TX",          capacity_mw: 1500 },
  { from: "Panda Temple Power (Temple, TX)",       to: "Calpine Deer Park (Houston, TX)",  name: "Temple–Houston",              capacity_mw: 2500 },
  { from: "Calpine Deer Park (Houston, TX)",       to: "Vistra Midlothian BESS (TX)",      name: "Houston–DFW Storage",         capacity_mw: 1800 },

  // Eastern interconnection
  { from: "Fowler Ridge (Benton County, IN)",      to: "Robert Moses Niagara (NY)",        name: "Midwest–Northeast Tie",       capacity_mw: 3500 },
  { from: "Robert Moses Niagara (NY)",             to: "West County Energy Center (FL)",   name: "East Coast North–South",      capacity_mw: 4000 },
];

async function seed() {
  console.log("🔌 Seeding transmission_lines...\n");

  // Fetch all nodes with their locations
  const { data: nodes, error: fetchError } = await supabase
    .from("generation_nodes")
    .select("id, name, location");

  if (fetchError || !nodes) {
    console.error("❌ Could not fetch nodes:", fetchError?.message);
    process.exit(1);
  }

  // Build a lookup: name → { id, lng, lat }
  const nodeLookup = new Map<string, { id: string; lng: number; lat: number }>();
  for (const node of nodes) {
    const coords = parseEWKBPoint(node.location as string);
    if (coords) {
      nodeLookup.set(node.name, { id: node.id, lng: coords.lng, lat: coords.lat });
    }
  }

  console.log(`   Found ${nodeLookup.size} nodes in database.\n`);

  // Clear existing lines
  const { error: deleteError } = await supabase
    .from("transmission_lines")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.error("⚠️  Could not clear existing lines:", deleteError.message);
  }

  // Build rows
  const rows = [];
  const skipped: string[] = [];

  for (const def of LINE_DEFINITIONS) {
    const fromNode = nodeLookup.get(def.from);
    const toNode = nodeLookup.get(def.to);

    if (!fromNode || !toNode) {
      skipped.push(`${def.name} (missing: ${!fromNode ? def.from : def.to})`);
      continue;
    }

    rows.push({
      name: def.name,
      from_node_id: fromNode.id,
      to_node_id: toNode.id,
      capacity_mw: def.capacity_mw,
      current_load_mw: Math.round(def.capacity_mw * (0.3 + Math.random() * 0.5)), // 30-80% load
      status: "normal" as const,
      from_coords: `POINT(${fromNode.lng} ${fromNode.lat})`,
      to_coords: `POINT(${toNode.lng} ${toNode.lat})`,
    });
  }

  if (skipped.length > 0) {
    console.log(`   ⚠️  Skipped ${skipped.length} lines (node not found):`);
    for (const s of skipped) console.log(`      - ${s}`);
    console.log();
  }

  const { data, error } = await supabase
    .from("transmission_lines")
    .insert(rows)
    .select("id, name, capacity_mw, status");

  if (error) {
    console.error("❌ Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${data.length} transmission lines:\n`);
  for (const line of data) {
    console.log(`   ${line.name} — ${line.capacity_mw} MW (${line.status})`);
  }
  console.log("\n🎉 Done!");
}

seed();
