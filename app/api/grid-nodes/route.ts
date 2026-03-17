/*
  GRID NODES DATA ROUTE
  ─────────────────────
  GET /api/grid-nodes
  Reads the cached EIA plant data from disk and streams it to clients.

  Why an API route instead of a static import?
  Importing data/eia-plants.json directly in a client module inlines
  ~1-2 MB of plant records into every page's JS bundle. Serving it here
  means the file is read server-side on demand and cached by the browser,
  keeping page bundles small.

  Cache strategy: plants change only when the ingest cron runs (at most
  once a day), so a 1-hour CDN cache with a 24-hour stale-while-revalidate
  window is safe and eliminates redundant reads.
*/

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function GET() {
  try {
    const raw = readFileSync(resolve(process.cwd(), "data/eia-plants.json"), "utf-8");
    const { plants } = JSON.parse(raw) as { plants: unknown[] };

    return NextResponse.json(plants ?? [], {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // File missing (e.g. fresh checkout before first ingest run) — return empty list
    // so the app renders without crashing; the map will show no markers.
    return NextResponse.json([]);
  }
}
