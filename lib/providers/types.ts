/**
 * Provider interfaces - the seam between the UI and external data sources.
 *
 * Each domain (satellite, weather, sensors) gets one interface. The app talks
 * only to these interfaces; concrete providers (mock today, Sentinel-2 /
 * OpenWeather / real IoT tomorrow) implement them. Swapping a provider is a
 * single-file change in registry.ts - nothing downstream is affected.
 *
 * All methods are async (real providers hit the network) and take an explicit
 * date/field id so they're cacheable and parallelizable.
 */
import type {
  IsoDate,
  NdviSample,
  SensorImage,
  SensorReading,
  WeatherDay,
  WeatherDayForecast,
  WeatherHour,
} from "@/lib/types";

export interface ISatelliteProvider {
  /** NDVI time series for a field, oldest-first. */
  getNdviSeries(fieldId: string): Promise<NdviSample[]>;
  /** Most recent NDVI at or before `asOf`. */
  getNdviAt(fieldId: string, asOf: IsoDate): Promise<NdviSample | undefined>;
  /**
   * Render an XYZ tile (z/x/y) of NDVI imagery for the map raster overlay.
   * Returns a PNG/JPEG ArrayBuffer, or `null` if the provider has no raster
   * capability (the mock returns null so the map falls back to polygon fills).
   * `date` is the acquisition date to render.
   */
  getNdviTile(
    z: number,
    x: number,
    y: number,
    date: IsoDate,
  ): Promise<ArrayBuffer | null>;
}

export interface IWeatherProvider {
  /** Daily weather for a field, oldest-first. */
  getWeatherSeries(fieldId: string): Promise<WeatherDay[]>;
  /** Weather day at or before `asOf` (latest-known semantics). */
  getWeatherAt(
    fieldId: string,
    asOf: IsoDate,
  ): Promise<WeatherDay | undefined>;
  /** Forward-looking hourly forecast (next ~48h), oldest-first. */
  getHourlyForecast(fieldId: string): Promise<WeatherHour[]>;
  /** Forward-looking daily forecast (next ~7d), oldest-first. */
  getDailyForecast(fieldId: string): Promise<WeatherDayForecast[]>;
}

export interface ISensorProvider {
  /** Imagery captures for a camera sensor, oldest-first. */
  getImages(sensorId: string, channel?: SensorImage["channel"]): Promise<SensorImage[]>;
  /** Soil readings for a ground sensor, oldest-first. */
  getReadings(sensorId: string): Promise<SensorReading[]>;
  /** Notes logged against a sensor, oldest-first. */
  getNotes(sensorId: string): Promise<import("@/lib/types").Note[]>;
}
