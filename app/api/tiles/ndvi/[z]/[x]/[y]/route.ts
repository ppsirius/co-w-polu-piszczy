import { NextResponse } from "next/server";
import { satelliteProvider } from "@/lib/providers/registry";

/**
 * NDVI raster tile proxy - the secure token-injection point.
 *
 * GET /api/tiles/ndvi/{z}/{x}/{[y]}?date=YYYY-MM-DD
 *
 * The map's raster source points HERE, not at Sentinel Hub directly, so the
 * OAuth2 client credentials never reach the browser. This route attaches the
 * Bearer token server-side (inside the provider) and streams the PNG back.
 *
 * Tiles are immutable for a given (z, x, y, date) so the response is cached
 * aggressively. When Sentinel isn't configured (mock) or has no imagery for the
 * tile/date, returns 404 - Mapbox treats that as an empty tile.
 */
// Raster tiles are dynamic per request params; never fully static-prerender.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await context.params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);
  if (!Number.isInteger(zi) || !Number.isInteger(xi) || !Number.isInteger(yi)) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Missing or invalid date" }, { status: 400 });
  }

  // Any failure (auth down, bad creds, no imagery) -> 404. A 404 tells Mapbox
  // the tile simply isn't available, which it handles gracefully (empty tile,
  // no retry storm). A 500 would make Mapbox retry every tile repeatedly.
  let tile: ArrayBuffer | null = null;
  try {
    tile = await satelliteProvider.getNdviTile(zi, xi, yi, date);
  } catch {
    tile = null;
  }
  if (!tile) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(tile, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Long cache: a tile for a given date+xyz never changes.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
