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
import type { IsoDate, NdviSample, SensorImage, SensorReading, WeatherDay } from "@/lib/types";

export interface ISatelliteProvider {
  /** NDVI time series for a field, oldest-first. */
  getNdviSeries(fieldId: string): Promise<NdviSample[]>;
  /** Most recent NDVI at or before `asOf`. */
  getNdviAt(fieldId: string, asOf: IsoDate): Promise<NdviSample | undefined>;
}

export interface IWeatherProvider {
  /** Daily weather for a field, oldest-first. */
  getWeatherSeries(fieldId: string): Promise<WeatherDay[]>;
  /** Weather day at or before `asOf` (latest-known semantics). */
  getWeatherAt(
    fieldId: string,
    asOf: IsoDate,
  ): Promise<WeatherDay | undefined>;
}

export interface ISensorProvider {
  /** Imagery captures for a camera sensor, oldest-first. */
  getImages(sensorId: string, channel?: SensorImage["channel"]): Promise<SensorImage[]>;
  /** Soil readings for a ground sensor, oldest-first. */
  getReadings(sensorId: string): Promise<SensorReading[]>;
  /** Notes logged against a sensor, oldest-first. */
  getNotes(sensorId: string): Promise<import("@/lib/types").Note[]>;
}
