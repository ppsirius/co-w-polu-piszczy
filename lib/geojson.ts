import { sensors } from "@/lib/mock/data";
import { clamp } from "@/lib/utils/number";
import type { Field, IsoDate, MapLayer } from "@/lib/types";

/**
 * Build GeoJSON for the map. Fields -> polygons, sensors -> points.
 *
 * The active layer determines each field's fill color. Layer VALUES are not
 * fetched here: `fieldFeatures` is a pure geometry + color function that takes
 * a pre-built values map (`{ [fieldId]: number | null }`) from the BFF. This
 * keeps the provider/data source (mock today, Open-Meteo / Sentinel-2 tomorrow)
 * on the server side; the client only renders what it's handed.
 */

/**
 * Neutral fill for the plain "Mapa" layer (no data overlay). A light teal tint
 * (project primary, low saturation) so fields read clearly against the satellite
 * basemap without implying any data-driven coloring. The fill-opacity in MapView
 * keeps it subtle.
 */
const NEUTRAL_FIELD_FILL = "#0A9E8F";

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

/**
 * Per-field values keyed by field id, for the currently active layer. Built
 * server-side by `getMapLayerValues` (lib/map-values.ts) and fetched via
 * `/api/map/layers`. `null` = no data for that field/layer/date (rendered in
 * the no-data tint).
 */
export type LayerValues = Record<string, number | null>;

/**
 * Full BFF response: field id -> (layer -> value), one entry per field with all
 * five layers PLUS the NDVI acquisition date. Kept here (pure types only) so
 * the client can type the fetch WITHOUT importing the server-only map-values.ts
 * module.
 */
export type MapLayerValuesResponse = Record<
  string,
  Record<MapLayer, number | null> & { ndviAcquiredAt?: IsoDate | null }
>;

/**
 * Project the full response down to a single layer's values
 * (`{ [fieldId]: value }`), the shape fieldFeatures() expects. Pure, so the map
 * can call it on every layer toggle from the cached payload without refetching.
 */
export function pickLayerValues(
  all: MapLayerValuesResponse,
  layer: MapLayer,
): LayerValues {
  const out: LayerValues = {};
  for (const [fieldId, lv] of Object.entries(all)) {
    out[fieldId] = lv[layer] ?? null;
  }
  return out;
}

/**
 * The NDVI acquisition date to surface in the legend. Sentinel-2 only revisits
 * every ~5 days, so the per-field reading may come from a different pass per
 * field (each finds its own nearest cloud-free day). We show the MOST RECENT
 * pass across all fields - that's the freshest imagery the user is looking at
 * and the honest upper bound for "how stale is this view". Returns null when no
 * field has NDVI data (mock without raster, all-cloudy window).
 */
export function pickNdviAcquiredAt(all: MapLayerValuesResponse): IsoDate | null {
  let latest: IsoDate | null = null;
  for (const lv of Object.values(all)) {
    const d = lv.ndviAcquiredAt;
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

export function fieldFeatures(
  layer: MapLayer,
  fields: Field[],
  values: LayerValues,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: fields.map((field) => {
      const value = values[field.id] ?? null;
      // "none" (plain basemap) uses a neutral fill so fields are visible without
      // implying a data layer; every other layer colors by its value ramp.
      const color = layer === "none" ? NEUTRAL_FIELD_FILL : layerColor(layer, value);
      return {
        type: "Feature" as const,
        geometry: field.polygon,
        properties: {
          fieldId: field.id,
          name: field.name,
          crop: field.crop.crop,
          status: field.status,
          layerValue: value,
          color,
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

/**
 * Color ramp for NDVI (-1..1). Real satellite NDVI uses this scale.
 * Values are clamped to the vegetation range [0, 0.9] for the mock.
 */
function ndviColor(value: number | null): string {
  if (value === null) return "#9CA3AF"; // ink-subtle, no data
  const v = clamp(value, 0, 0.9);
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
    case "none":
      return "#9CA3AF";
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
