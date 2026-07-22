/**
 * Field metrics aggregation - the BFF logic shared by the dashboard and the
 * /api/fields/[id]/metrics route. Pulls NDVI + weather + soil from the
 * provider layer and folds them into a single FieldMetrics object.
 */
import { satelliteProvider } from "@/lib/providers/registry";
import { sensorProvider } from "@/lib/providers/registry";
import { weatherProvider } from "@/lib/providers/registry";
import { getSensorsForField } from "@/lib/mock/data";
import type { FieldMetrics, IsoDate, Trend } from "@/lib/types";

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

  const latest = [...ndviSeries].reverse().find((s) => s.date <= asOf);
  if (!latest) return null;
  const latestIdx = ndviSeries.findIndex((s) => s.date === latest.date);
  const previous = latestIdx > 0 ? ndviSeries[latestIdx - 1] : undefined;

  // Average soil moisture across all ground sensors in the field.
  const groundSensors = getSensorsForField(fieldId).filter((s) => s.kind === "glebowy");
  let moisturePct = 0;
  if (groundSensors.length > 0) {
    const readings = await Promise.all(
      groundSensors.map((s) => sensorProvider.getReadings(s.id)),
    );
    const latestReadings = readings
      .map((r) => [...r].reverse().find((x) => x.date <= asOf))
      .filter((r): r is NonNullable<typeof r> => Boolean(r));
    if (latestReadings.length > 0) {
      moisturePct =
        latestReadings.reduce((sum, r) => sum + r.soilMoisturePct, 0) /
        latestReadings.length;
    }
  }

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
    soil: {
      moisturePct: Math.round(moisturePct),
    },
  };
}
