/*
  GEO UTILITIES
  ─────────────
  PostGIS stores geography as EWKB (Extended Well-Known Binary).
  When queried via PostgREST/Supabase, the `location` column comes back
  as a hex string like: "0101000020E61000000000000000905DC0CDCCCCCCCC6C4140"

  This module parses that hex into { lng, lat } so we can pass it to Mapbox.

  EWKB Point format (little-endian):
    Bytes  0:    endianness (01 = LE)
    Bytes  1-4:  geometry type (01000020 = Point with SRID)
    Bytes  5-8:  SRID (E6100000 = 4326)
    Bytes  9-16: X coordinate (float64 = longitude)
    Bytes 17-24: Y coordinate (float64 = latitude)
*/

/**
 * Parse an EWKB hex string (Point with SRID 4326) into lng/lat.
 * Returns { lng: number, lat: number } or null if parsing fails.
 */
export function parseEWKBPoint(hex: string): { lng: number; lat: number } | null {
  try {
    // EWKB Point with SRID = 50 hex chars (25 bytes)
    if (hex.length < 50) return null;

    // X starts at byte 9 (hex char 18), Y starts at byte 17 (hex char 34)
    const xHex = hex.slice(18, 34); // 16 hex chars = 8 bytes
    const yHex = hex.slice(34, 50);

    const lng = hexToFloat64LE(xHex);
    const lat = hexToFloat64LE(yHex);

    // Sanity check — valid Earth coordinates
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;

    return { lng, lat };
  } catch {
    return null;
  }
}

/** Convert 16-char hex (8 bytes, little-endian) to a float64. */
function hexToFloat64LE(hex: string): number {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  // Reverse for little-endian → big-endian (DataView reads big-endian by default)
  bytes.reverse();
  const view = new DataView(bytes.buffer);
  return view.getFloat64(0);
}
