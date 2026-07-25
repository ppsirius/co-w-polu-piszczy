import { NextResponse } from "next/server";
import { getMapLayerValues } from "@/lib/map-values";
import { todayIso } from "@/lib/utils/today";

/**
 * Map layer values endpoint - the map page's single data contract.
 *
 * GET /api/map/layers?date=YYYY-MM-DD
 *
 * Returns `{ [fieldId]: { ndvi, temperature, gdd, moisture, dew } }` for every
 * field, resolved at-or-before the requested date. The map fetches this once
 * per date change and recolors polygons client-side when the active layer
 * changes (no refetch needed for layer toggles).
 *
 * Swapping providers (mock -> Open-Meteo / Sentinel-2) happens behind
 * getMapLayerValues; this response shape never changes. Short cache so rapid
 * layer toggles during a session don't refetch.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedDate = url.searchParams.get("date");
  const today = todayIso();

  // Default to the real today (not the frozen mock), and clamp future dates to
  // today so live providers aren't asked for acquisitions that can't exist yet.
  const date = requestedDate && requestedDate <= today ? requestedDate : today;

  const values = await getMapLayerValues(date);

  return NextResponse.json(values, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
