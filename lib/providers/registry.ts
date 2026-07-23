/**
 * Provider registry - the single switch point for data sources.
 *
 * Providers are env-gated so the app runs out-of-the-box on mock data, but flips
 * to live sources the moment credentials/flags are set:
 *   - weather:  Open-Meteo is keyless, so it's LIVE BY DEFAULT. Set
 *               OPEN_METEO_BASE_URL=mock to force the mock (deterministic
 *               dev/tests).
 *   - satellite: Sentinel-2 when SENTINEL_CLIENT_ID + SENTINEL_SECRET are set,
 *                else the in-memory mock NDVI dataset.
 *   - sensor:    mock until an IoT provider is added.
 *
 * To go fully live you only set env vars here; no other file in the app changes
 * - everything depends on the interfaces in types.ts, not on these classes.
 */
import { MockSatelliteProvider } from "@/lib/providers/mock-satellite";
import { MockSensorProvider } from "@/lib/providers/mock-sensor";
import { MockWeatherProvider } from "@/lib/providers/mock-weather";
import { OpenMeteoWeatherProvider } from "@/lib/providers/open-meteo";
import { Sentinel2SatelliteProvider } from "@/lib/providers/sentinel";
import type {
  ISatelliteProvider,
  ISensorProvider,
  IWeatherProvider,
} from "@/lib/providers/types";

const useMockWeather = process.env.OPEN_METEO_BASE_URL === "mock";

export const weatherProvider: IWeatherProvider = useMockWeather
  ? new MockWeatherProvider()
  : new OpenMeteoWeatherProvider(process.env.OPEN_METEO_BASE_URL);

// Sentinel-2 when credentials are present (create() returns null otherwise);
// falls back to the in-memory mock NDVI dataset.
export const satelliteProvider: ISatelliteProvider =
  Sentinel2SatelliteProvider.create() ?? new MockSatelliteProvider();

export const sensorProvider: ISensorProvider = new MockSensorProvider();

