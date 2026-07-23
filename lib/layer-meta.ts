import type { MapLayer } from "@/lib/types";

/**
 * Per-layer legend metadata for the map. Describes the color scale (stops used
 * by the ramps in lib/geojson.ts), the unit, and the data source - so the
 * LayerLegend can render a scale + attribution without hardcoding in JSX.
 *
 * `source` notes where the value comes from once providers are swapped, so the
 * user can tell real data from mock at a glance.
 */
export type LegendStop = {
  /** Upper bound of this stop (inclusive of the next ramp threshold). */
  at: number;
  /** Hex color, mirroring lib/geojson.ts layerColor helpers. */
  color: string;
  /** Short label shown under the swatch. */
  label: string;
};

export type LayerMeta = {
  /** Human-readable unit suffix, e.g. "°C", "%", "h", "". */
  unit: string;
  /** Ordered color stops, low -> high. */
  stops: LegendStop[];
  /** Data source attribution (legend + future tooltip). */
  source: string;
  /** Whether this layer renders as raster imagery rather than polygons. */
  raster: boolean;
};

export const layerMeta: Record<MapLayer, LayerMeta> = {
  none: {
    unit: "",
    source: "mapa bazowa",
    raster: false,
    stops: [],
  },
  ndvi: {
    unit: "",
    source: "Sentinel-2 (NDVI)",
    raster: true,
    stops: [
      { at: 0.2, color: "#92400E", label: "brak roślinności" },
      { at: 0.4, color: "#CA8A04", label: "rzadka" },
      { at: 0.6, color: "#A3A320", label: "średnia" },
      { at: 0.75, color: "#4D7C0F", label: "gęsta" },
      { at: 1, color: "#059669", label: "bardzo gęsta" },
    ],
  },
  temperature: {
    unit: "°C",
    source: "Open-Meteo",
    raster: false,
    stops: [
      { at: 15, color: "#1D4ED8", label: "<15" },
      { at: 17, color: "#3B82F6", label: "15-17" },
      { at: 19, color: "#0A9E8F", label: "17-19" },
      { at: 21, color: "#F59E0B", label: "19-21" },
      { at: 99, color: "#DC2626", label: ">21" },
    ],
  },
  gdd: {
    unit: "°C·d",
    source: "Open-Meteo (obliczone)",
    raster: false,
    stops: [
      { at: 1400, color: "#1D4ED8", label: "<1400" },
      { at: 1700, color: "#3B82F6", label: "1400-1700" },
      { at: 1900, color: "#0A9E8F", label: "1700-1900" },
      { at: 2100, color: "#F59E0B", label: "1900-2100" },
      { at: 99999, color: "#DC2626", label: ">2100" },
    ],
  },
  moisture: {
    unit: "%",
    source: "czujniki glebowe",
    raster: false,
    stops: [
      { at: 15, color: "#DC2626", label: "<15" },
      { at: 22, color: "#F59E0B", label: "15-22" },
      { at: 30, color: "#CA8A04", label: "22-30" },
      { at: 40, color: "#4D7C0F", label: "30-40" },
      { at: 101, color: "#059669", label: ">40" },
    ],
  },
  dew: {
    unit: "h",
    source: "Open-Meteo (szacowane)",
    raster: false,
    stops: [
      { at: 2, color: "#059669", label: "<2" },
      { at: 4, color: "#4D7C0F", label: "2-4" },
      { at: 5, color: "#CA8A04", label: "4-5" },
      { at: 6, color: "#F59E0B", label: "5-6" },
      { at: 25, color: "#DC2626", label: ">6" },
    ],
  },
};
