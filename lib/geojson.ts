import {
  getSensorsForField,
  ndviSamples,
  sensorReadings,
  sensors,
  weatherDays,
} from "@/lib/mock/data";
import { fields as seedFields } from "@/lib/mock/data";
import type { Field, IsoDate, MapLayer } from "@/lib/types";

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
    color: string;
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
  date: IsoDate,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: fields.map((field) => {
      const value = layerValueFor(field.id, layer, date);
      return {
        type: "Feature" as const,
        geometry: field.polygon,
        properties: {
          fieldId: field.id,
          name: field.name,
          crop: field.crop.crop,
          status: field.status,
          layerValue: value,
          color: layerColor(layer, value),
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

/** Most recent row on or before `date` (mock zonal stat at a point in time). */
function asOf<T extends { date: string }>(rows: T[], date: string): T | undefined {
  return rows
    .filter((r) => r.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function layerValueFor(
  fieldId: string,
  layer: MapLayer,
  date: IsoDate,
): number | null {
  if (layer === "ndvi") {
    return (
      asOf(ndviSamples.filter((s) => s.fieldId === fieldId), date)?.value ?? null
    );
  }
  if (layer === "moisture") {
    const ground = getSensorsForField(fieldId).find((s) => s.kind === "glebowy");
    if (!ground) return null;
    return (
      asOf(sensorReadings.filter((r) => r.sensorId === ground.id), date)
        ?.soilMoisturePct ?? null
    );
  }
  const wx = asOf(weatherDays.filter((w) => w.fieldId === fieldId), date);
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

/**
 * Per-layer fill color for a field's zonal value. NDVI delegates to the
 * vegetation ramp above; every other layer has its own calibrated scale so the
 * map reads correctly regardless of which metric is active (previously the NDVI
 * ramp was applied to temperature/GDD, which always maxed out green).
 * Returns the no-data tint when the field has no reading for the layer.
 */
export function layerColor(layer: MapLayer, value: number | null): string {
  if (value === null) return "#9CA3AF";
  switch (layer) {
    case "ndvi":
      return ndviColor(value);
    case "temperature":
      return temperatureColor(value);
    case "gdd":
      return gddColor(value);
    case "moisture":
      return moistureColor(value);
    case "dew":
      return dewColor(value);
  }
}

/** Avg daily temperature, ~14-22°C: cool blue -> comfortable teal -> hot red. */
function temperatureColor(c: number): string {
  if (c < 15) return "#1D4ED8";
  if (c < 17) return "#3B82F6";
  if (c < 19) return "#0A9E8F";
  if (c < 21) return "#F59E0B";
  return "#DC2626";
}

/** Cumulative growing degree days, ~1200-2300: low -> high heat accumulation. */
function gddColor(gdd: number): string {
  if (gdd < 1400) return "#1D4ED8";
  if (gdd < 1700) return "#3B82F6";
  if (gdd < 1900) return "#0A9E8F";
  if (gdd < 2100) return "#F59E0B";
  return "#DC2626";
}

/** Soil moisture %, 8-60: red (dry/stress) -> green (adequate) -> teal (wet). */
function moistureColor(pct: number): string {
  if (pct < 15) return "#DC2626";
  if (pct < 22) return "#F59E0B";
  if (pct < 30) return "#CA8A04";
  if (pct < 40) return "#4D7C0F";
  return "#059669";
}

/** Leaf-wetness / dew hours, 0-7: low disease pressure (green) -> high (red). */
function dewColor(hours: number): string {
  if (hours < 2) return "#059669";
  if (hours < 4) return "#4D7C0F";
  if (hours < 5) return "#CA8A04";
  if (hours < 6) return "#F59E0B";
  return "#DC2626";
}
