import { NextResponse } from "next/server";
import { getMapLayerValues } from "@/lib/map-values";
import type { MapLayerValuesResponse } from "@/lib/geojson";
import { TODAY } from "@/lib/mock/data";

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

  // Clamp to the dataset range. TODAY is the mock "now"; a live provider will
  // resolve real dates but clamping keeps the dashboard date slider sensible.
  const date = requestedDate && requestedDate <= TODAY ? requestedDate : TODAY;

  const values = await getMapLayerValues(date);

  return NextResponse.json(values, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
