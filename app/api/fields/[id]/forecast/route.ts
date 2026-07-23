import { NextResponse } from "next/server";
import { getField } from "@/lib/mock/data";
import { weatherProvider } from "@/lib/providers/registry";
import type { FieldForecast } from "@/lib/types";

/**
 * Forecast BFF endpoint for the /pogoda page.
 *
 * GET /api/fields/[id]/forecast
 *
 * Folds the 48h hourly + 7-day daily forecast into one FieldForecast JSON so
 * the weather page hits one endpoint. The forecast is forward-looking only
 * (no `date` query param): providers return from "now". Swap providers
 * (mock -> Open-Meteo) behind the registry; this response shape never changes.
 *
 * Short cache: forecasts drift slowly, and a fresh request per field switch is
 * cheap compared to repeated upstream hits during a session.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const field = getField(id);
  if (!field) {
    return NextResponse.json(
      { error: `Field '${id}' not found` },
      { status: 404 },
    );
  }

  const [hourly, daily] = await Promise.all([
    weatherProvider.getHourlyForecast(id),
    weatherProvider.getDailyForecast(id),
  ]);

  const payload: FieldForecast = { fieldId: id, hourly, daily };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
    },
  });
}
