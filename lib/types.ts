/**
 * Domain model for the AgroTech platform.
 * Provider-agnostic: these types describe WHAT the UI renders, not HOW data is fetched.
 * Concrete providers (mock or real Sentinel-2/OpenWeather) map their responses into these.
 */

/** ISO date string (YYYY-MM-DD). Used as the canonical time key across the app. */
export type IsoDate = string;

/** Position in [longitude, latitude] - GeoJSON / MapLibre convention. */
export type LngLat = [number, number];

/** Minimal GeoJSON polygon for a field boundary (single ring, no holes). */
export type FieldPolygon = {
  type: "Polygon";
  coordinates: [LngLat[]]; // outer ring
};

/** Center point of a field or sensor. */
export type Point = {
  type: "Point";
  coordinates: LngLat;
};

export type CropType =
  | "pszenica_ozima"
  | "rzepak"
  | "kukurydza"
  | "jeczmien"
  | "burak_cukrowy";

export type CropRotation = {
  crop: CropType;
  sowingDate: IsoDate; // data siewu
  expectedHarvestDate: IsoDate;
  /** Base temperature (°C) for GDD accumulation, crop-specific. */
  baseTempC: number;
};

/** Layer a field can be colored by on the map. "none" = plain basemap, no overlay. */
export type MapLayer =
  | "none"
  | "ndvi"
  | "temperature"
  | "gdd"
  | "moisture"
  | "dew";

/** Quality of a field snapshot, surfaced as a status pill. */
export type FieldStatus = "normal" | "warning" | "urgent" | "follow-up" | "info";

export type Field = {
  id: string;
  name: string;
  crop: CropRotation;
  areaHa: number;
  polygon: FieldPolygon;
  centroid: LngLat;
  status: FieldStatus;
};

/** Sensor type deployed in the field. */
export type SensorKind = "glebowy" | "kamera_rgb" | "kamera_ir" | "stacja_meteo";

export type SensorStatus = "online" | "offline" | "warning";

export type Sensor = {
  id: string;
  fieldId: string;
  name: string;
  kind: SensorKind;
  position: Point;
  status: SensorStatus;
  /** Battery percentage, 0-100. */
  batteryPct: number;
  lastSeenAt: IsoDate;
};

/** One imagery channel captured by a camera sensor at a given date. */
export type ImageChannel = "rgb" | "ir" | "ndvi";

export type SensorImage = {
  id: string;
  sensorId: string;
  date: IsoDate;
  channel: ImageChannel;
  /** Static placeholder URL (picsum) for mock; real data would be a tile URL. */
  url: string;
};

/** NDVI reading for a field, sampled at satellite cadence (~every 5 days). */
export type NdviSample = {
  fieldId: string;
  date: IsoDate;
  /** Mean NDVI across the polygon, -1..1. */
  value: number;
};

export type Trend = "up" | "down" | "flat";

/** One day of weather for a field's centroid. */
export type WeatherDay = {
  fieldId: IsoDate | string;
  date: IsoDate;
  tempAvgC: number;
  tempMinC: number;
  tempMaxC: number;
  /** Cumulative growing degree days up to and including this date. */
  gddCumulative: number;
  /** Hours of leaf wetness / dew duration. */
  dewHours: number;
  /** Relative humidity %, 0-100. */
  humidityPct: number;
};

/** Soil moisture + temperature reading from a ground sensor. */
export type SensorReading = {
  sensorId: string;
  date: IsoDate;
  soilMoisturePct: number; // 0-100
  soilTempC: number;
  /** Electrical conductivity, dS/m (proxy for salinity/fertilizer). */
  ecDsM: number;
};

/** Agronomist note logged against a sensor/field at a point in time. */
export type Note = {
  id: string;
  sensorId: string;
  date: IsoDate;
  author: string;
  text: string;
};

/** Aggregated metric for a field card / BFF response. */
export type FieldMetrics = {
  fieldId: string;
  asOf: IsoDate;
  ndvi: {
    current: number;
    trend: Trend;
  };
  weather: {
    tempAvgC: number;
    gddCumulative: number;
    dewHours: number;
  };
  soil: {
    moisturePct: number;
  };
};
