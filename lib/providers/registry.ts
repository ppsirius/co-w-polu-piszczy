/**
 * Provider registry - the single switch point for data sources.
 *
 * Today every domain uses its mock implementation. To go live:
 *   1. Implement e.g. `Sentinel2SatelliteProvider` in a sibling file.
 *   2. Swap the instance returned here.
 * No other file in the app needs to change - everything depends on the
 * interfaces in types.ts, not on these classes.
 */
import { MockSatelliteProvider } from "@/lib/providers/mock-satellite";
import { MockSensorProvider } from "@/lib/providers/mock-sensor";
import { MockWeatherProvider } from "@/lib/providers/mock-weather";
import type {
  ISatelliteProvider,
  ISensorProvider,
  IWeatherProvider,
} from "@/lib/providers/types";

export const satelliteProvider: ISatelliteProvider =
  new MockSatelliteProvider();
export const weatherProvider: IWeatherProvider = new MockWeatherProvider();
export const sensorProvider: ISensorProvider = new MockSensorProvider();
