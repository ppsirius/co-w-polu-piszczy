import { NextResponse } from "next/server";
import { getFieldMetrics } from "@/lib/metrics";
import { getField, TODAY } from "@/lib/mock/data";

/**
 * BFF aggregation endpoint (brief §1).
 *
 * GET /api/fields/[id]/metrics?date=YYYY-MM-DD
 *
 * Folds NDVI (satellite) + soil moisture (sensors) + weather (GDD, temp, dew)
 * into a single FieldMetrics JSON, so the panel hits one endpoint instead of
 * five. Date defaults to the latest mock date; out-of-range dates clamp.
 *
 * This route is the single client-facing contract. Swap providers behind it and
 * the response shape never changes.
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

  const url = new URL(_request.url);
  const requestedDate = url.searchParams.get("date");
  // Clamp to the mock dataset range so clients can't ask for future dates.
  const date = requestedDate ? clampDate(requestedDate) : TODAY;

  const metrics = await getFieldMetrics(id, date);
  if (!metrics) {
    return NextResponse.json(
      { error: `No metrics available for field '${id}' at ${date}` },
      { status: 404 },
    );
  }

  // Tag the response so clients can tell which date was actually resolved.
  return NextResponse.json({ ...metrics, resolvedDate: date });
}

function clampDate(iso: string): string {
  if (iso <= "2026-05-01") return "2026-05-01";
  if (iso >= TODAY) return TODAY;
  return iso;
}
