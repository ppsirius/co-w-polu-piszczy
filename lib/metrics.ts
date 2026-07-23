/**
 * Field metrics aggregation - the BFF logic shared by the dashboard and the
 * /api/fields/[id]/metrics route. Pulls NDVI + weather + soil from the
 * provider layer and folds them into a single FieldMetrics object.
 */
import { satelliteProvider } from "@/lib/providers/registry";
import { sensorProvider } from "@/lib/providers/registry";
import { weatherProvider } from "@/lib/providers/registry";
import { getSensorsForField, ndviSamples } from "@/lib/mock/data";
import type { FieldMetrics, IsoDate, NdviSample, Trend } from "@/lib/types";

function deriveTrend(current: number, previous: number | undefined): Trend {
  if (previous === undefined) return "flat";
  const delta = current - previous;
  if (Math.abs(delta) < 0.005) return "flat";
  return delta > 0 ? "up" : "down";
}

export async function getFieldMetrics(
  fieldId: string,
  asOf: IsoDate,
): Promise<FieldMetrics | null> {
  const [ndviSeries, weatherDay] = await Promise.all([
    satelliteProvider.getNdviSeries(fieldId),
    weatherProvider.getWeatherAt(fieldId, asOf),
  ]);

  // The live Sentinel-2 provider implements only point queries (getNdviAt +
  // raster tiles); its getNdviSeries() is a stub that returns []. The
  // dashboard card needs a series for the trend arrow, so fall back to the
  // deterministic mock NDVI dataset when the active provider has no series.
  // This mirrors the documented intent ("dashboard card uses trend from the
  // mock until implemented") and keeps the card populated with mock-first data,
  // the same way /sensors always reads mock data via the always-mock
  // sensorProvider.
  const series =
    ndviSeries.length > 0
      ? ndviSeries
      : ndviSamples.filter((s) => s.fieldId === fieldId);

  const latest = [...series].reverse().find((s) => s.date <= asOf);
  // No NDVI at all (neither live nor mock) - still return the weather + soil
  // part of the payload instead of nuking everything. A null NDVI signals
  // "no satellite reading yet" without hiding the other metrics.
  if (!latest) {
    return {
      fieldId,
      asOf,
      ndvi: { current: 0, trend: "flat" },
      weather: {
        tempAvgC: weatherDay?.tempAvgC ?? 0,
        gddCumulative: weatherDay?.gddCumulative ?? 0,
        dewHours: weatherDay?.dewHours ?? 0,
      },
      soil: { moisturePct: await averageSoilMoisture(fieldId, asOf) },
    };
  }
  const latestIdx = series.findIndex((s) => s.date === latest.date);
  const previous = latestIdx > 0 ? series[latestIdx - 1] : undefined;

  return {
    fieldId,
    asOf,
    ndvi: {
      current: latest.value,
      trend: deriveTrend(latest.value, previous?.value),
    },
    weather: {
      tempAvgC: weatherDay?.tempAvgC ?? 0,
      gddCumulative: weatherDay?.gddCumulative ?? 0,
      dewHours: weatherDay?.dewHours ?? 0,
    },
    soil: { moisturePct: await averageSoilMoisture(fieldId, asOf) },
  };
}

/**
 * Mean soil moisture across all ground probes in a field at or before `asOf`.
 * sensorProvider is always the mock today (no live IoT provider exists), so this
 * reads the mock dataset - same source the /sensors grid uses per-card.
 */
async function averageSoilMoisture(
  fieldId: string,
  asOf: IsoDate,
): Promise<number> {
  const groundSensors = getSensorsForField(fieldId).filter(
    (s) => s.kind === "glebowy",
  );
  if (groundSensors.length === 0) return 0;
  const readings = await Promise.all(
    groundSensors.map((s) => sensorProvider.getReadings(s.id)),
  );
  const latestReadings = readings
    .map((r) => [...r].reverse().find((x) => x.date <= asOf))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (latestReadings.length === 0) return 0;
  const moisturePct =
    latestReadings.reduce((sum, r) => sum + r.soilMoisturePct, 0) /
    latestReadings.length;
  return Math.round(moisturePct);
}
