/**
 * Map layer values - the server-side aggregation that feeds the map page.
 *
 * For a given date, returns a `{ [fieldId]: { <layer>: value } }` map covering
 * all layers the map can color by. This is the map-page mirror of
 * lib/metrics.ts (which is per-field for the dashboard card): here we pull one
 * date across ALL fields and ALL layers in parallel, so the map hits a single
 * endpoint instead of N field endpoints.
 *
 * Data flows through the provider registry, so swapping mock -> live
 * (Open-Meteo / Sentinel-2) changes nothing here.
 */
import { fields, getSensorsForField } from "@/lib/mock/data";
import { satelliteProvider } from "@/lib/providers/registry";
import { sensorProvider } from "@/lib/providers/registry";
import { weatherProvider } from "@/lib/providers/registry";
import type { IsoDate, MapLayer } from "@/lib/types";

/**
 * SERVER-ONLY: this module imports the provider registry and therefore the
 * live provider implementations (Sentinel Hub credentials etc.). Client
 * components must NOT import it - they get layer values via the /api/map/layers
 * fetch and project them with the pure `pickLayerValues` helper in geojson.ts.
 */

/**
 * Per-field values: the 6 layer scalars PLUS the NDVI acquisition date.
 *
 * The acquisition date is reported separately from the selected date because
 * Sentinel-2 only revisits every ~5 days: the value shown for "selected date D"
 * is actually from the nearest cloud-free pass, which can be up to
 * +/- STATS_WINDOW_DAYS away. The legend surfaces this gap so the user doesn't
 * mistake a stale-ish reading for today's data. `null` when there's no NDVI
 * (mock with no raster) or the provider is offline.
 */
export type FieldLayerValues = Record<MapLayer, number | null> & {
  ndviAcquiredAt?: IsoDate | null;
};

/**
 * @param date ISO date the map is showing. Values are resolved at-or-before
 *             this date (latest-known semantics, shared with the BFF route).
 * @param fieldIds Optional subset; defaults to all seed fields.
 */
export async function getMapLayerValues(
  date: IsoDate,
  fieldIds: string[] = fields.map((f) => f.id),
): Promise<Record<string, FieldLayerValues>> {
  const entries = await Promise.all(
    fieldIds.map(async (fieldId) => [fieldId, await valuesForField(fieldId, date)] as const),
  );
  return Object.fromEntries(entries);
}

async function valuesForField(
  fieldId: string,
  date: IsoDate,
): Promise<FieldLayerValues> {
  const [ndvi, weather, moisture] = await Promise.all([
    satelliteProvider.getNdviAt(fieldId, date),
    weatherProvider.getWeatherAt(fieldId, date),
    moistureForField(fieldId, date),
  ]);

  return {
    none: null, // plain basemap layer has no per-field value
    ndvi: ndvi?.value ?? null,
    // Real acquisition date from the NDVI sample (mock: exact sample date;
    // live: nearest cloud-free Sentinel-2 pass in the +/-16d window).
    ndviAcquiredAt: ndvi?.date ?? null,
    temperature: weather?.tempAvgC ?? null,
    gdd: weather?.gddCumulative ?? null,
    dew: weather?.dewHours ?? null,
    moisture,
  };
}

/** Mean soil moisture across the field's ground sensors at-or-before `date`. */
async function moistureForField(
  fieldId: string,
  date: IsoDate,
): Promise<number | null> {
  const groundSensors = getSensorsForField(fieldId).filter(
    (s) => s.kind === "glebowy",
  );
  if (groundSensors.length === 0) return null;

  const readings = await Promise.all(
    groundSensors.map((s) => sensorProvider.getReadings(s.id)),
  );
  const latestReadings = readings
    .map((r) => [...r].reverse().find((x) => x.date <= date))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (latestReadings.length === 0) return null;

  return Math.round(
    latestReadings.reduce((sum, r) => sum + r.soilMoisturePct, 0) /
      latestReadings.length,
  );
}
