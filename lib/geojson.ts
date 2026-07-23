import {
  getSensorsForField,
  ndviSamples,
  sensorReadings,
  sensors,
  weatherDays,
} from "@/lib/mock/data";
import { fields as seedFields } from "@/lib/mock/data";
import type { Field, MapLayer } from "@/lib/types";

/**
 * Build GeoJSON for the map. Fields -> polygons, sensors -> points.
 * The active layer determines each field's fill color (NDVI scale by default).
 */

type FieldFeature = GeoJSON.Feature<
  GeoJSON.Polygon,
  {
    fieldId: string;
    name: string;
    crop: string;
    status: string;
    layerValue: number | null;
  }
>;

type SensorFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    sensorId: string;
    fieldId: string;
    name: string;
    kind: string;
    status: string;
    batteryPct: number;
  }
>;

export function fieldFeatures(
  layer: MapLayer,
  fields: Field[] = seedFields,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: fields.map((field) => {
      const value = layerValueFor(field.id, layer);
      return {
        type: "Feature" as const,
        geometry: field.polygon,
        properties: {
          fieldId: field.id,
          name: field.name,
          crop: field.crop.crop,
          status: field.status,
          layerValue: value,
        },
      } satisfies FieldFeature;
    }),
  };
}

export function sensorFeatures(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: sensors.map((sensor) => ({
      type: "Feature" as const,
      geometry: sensor.position,
      properties: {
        sensorId: sensor.id,
        fieldId: sensor.fieldId,
        name: sensor.name,
        kind: sensor.kind,
        status: sensor.status,
        batteryPct: sensor.batteryPct,
      },
    })) satisfies SensorFeature[],
  };
}

/** Latest available value for a field under the active layer (mock zonal stat). */
function latest<T extends { date: string }>(rows: T[]): T | undefined {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];
}

function layerValueFor(fieldId: string, layer: MapLayer): number | null {
  if (layer === "ndvi") {
    return (
      latest(ndviSamples.filter((s) => s.fieldId === fieldId))?.value ?? null
    );
  }
  if (layer === "moisture") {
    const ground = getSensorsForField(fieldId).find((s) => s.kind === "glebowy");
    if (!ground) return null;
    return (
      latest(sensorReadings.filter((r) => r.sensorId === ground.id))
        ?.soilMoisturePct ?? null
    );
  }
  const wx = latest(weatherDays.filter((w) => w.fieldId === fieldId));
  if (!wx) return null;
  if (layer === "temperature") return wx.tempAvgC;
  if (layer === "gdd") return wx.gddCumulative;
  if (layer === "dew") return wx.dewHours;
  return null;
}

/**
 * Color ramp for NDVI (-1..1). Real satellite NDVI uses this scale.
 * Values are clamped to the vegetation range [0, 0.9] for the mock.
 */
export function ndviColor(value: number | null): string {
  if (value === null) return "#9CA3AF"; // ink-subtle, no data
  const v = Math.max(0, Math.min(0.9, value));
  // Brown (bare) -> yellow -> green (healthy).
  if (v < 0.2) return "#92400E";
  if (v < 0.4) return "#CA8A04";
  if (v < 0.6) return "#A3A320";
  if (v < 0.75) return "#4D7C0F";
  return "#059669"; // matches normal status
}
