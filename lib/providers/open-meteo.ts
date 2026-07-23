import { getField } from "@/lib/mock/data";
import { computeGddCumulative } from "@/lib/gdd";
import type {
  IsoDate,
  WeatherDay,
  WeatherDayForecast,
  WeatherHour,
} from "@/lib/types";
import type { IWeatherProvider } from "@/lib/providers/types";

/**
 * Live weather provider backed by Open-Meteo (https://open-meteo.com).
 *
 * Open-Meteo is keyless for non-commercial use, so this is safe as a default.
 * Weather is queried by field centroid (lat/lng). GDD is DERIVED from the
 * returned min/max temps using the crop's base temperature (lib/gdd.ts) - it is
 * not a field on the Open-Meteo response. Dew hours are ESTIMATED from the
 * daily mean temperature vs dew point (no exact free source exists).
 *
 * Field definitions still come from the mock dataset today (getField); when a
 * real field store exists, only that lookup changes - this provider stays.
 */

const DEFAULT_BASE_URL = "https://api.open-meteo.com/v1/forecast";

// ~3 months of lookback satisfies the dashboard date range and GDD accumulation.
const LOOKBACK_DAYS = 92;

// The weather page shows the next 48h; cap how many hourly rows we map.
const HOURLY_CAP = 48;

type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  temperature_2m_mean: number[];
  relative_humidity_2m_mean: number[];
  dew_point_2m_mean: number[];
};

type OpenMeteoResponse = {
  daily: OpenMeteoDaily;
};

// --- Forecast response shape (hourly + daily + forecast_days) ---------------

type OpenMeteoHourly = {
  time: string[]; // local ISO timestamps incl. hour: "2026-07-23T13"
  temperature_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weather_code: number[];
};

type OpenMeteoForecastDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  temperature_2m_mean: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  weather_code: number[];
  wind_speed_10m_max: number[];
  relative_humidity_2m_mean: number[];
};

type OpenMeteoForecastResponse = {
  hourly: OpenMeteoHourly;
  daily: OpenMeteoForecastDaily;
};

// Returned when the field is unknown, so the forecast methods yield empty arrays
// instead of throwing - the route then 404s on a missing field anyway.
const EMPTY_HOURLY: OpenMeteoHourly = {
  time: [],
  temperature_2m: [],
  precipitation_probability: [],
  precipitation: [],
  weather_code: [],
};
const EMPTY_DAILY: OpenMeteoForecastDaily = {
  time: [],
  temperature_2m_max: [],
  temperature_2m_min: [],
  temperature_2m_mean: [],
  precipitation_probability_max: [],
  precipitation_sum: [],
  weather_code: [],
  wind_speed_10m_max: [],
  relative_humidity_2m_mean: [],
};

function isoDaysAgo(asOf: IsoDate, days: number): IsoDate {
  const d = new Date(asOf + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function isValidDate(iso: string): boolean {
  return !Number.isNaN(Date.parse(iso + "T00:00:00Z"));
}

/**
 * Estimate leaf-wetness / dew hours for a day. A rough agronomic proxy: count
 * the hours where mean temperature is at or below the dew point (condensation).
 * Using daily means this is coarse (0-24); flagged as an estimate, not a
 * measurement from a real wetness sensor.
 */
function estimateDewHours(tempMeanC: number, dewPointC: number): number {
  if (tempMeanC <= dewPointC) return 24;
  // Above the dew point, condensation is unlikely - clamp to 0.
  return 0;
}

export class OpenMeteoWeatherProvider implements IWeatherProvider {
  private readonly baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getWeatherSeries(fieldId: string): Promise<WeatherDay[]> {
    return this.fetchSeries(fieldId, isoDaysAgo(currentIsoDate(), LOOKBACK_DAYS));
  }

  async getWeatherAt(
    fieldId: string,
    asOf: IsoDate,
  ): Promise<WeatherDay | undefined> {
    const series = await this.getWeatherSeries(fieldId);
    // Latest day at or before the requested date.
    return [...series].reverse().find((d) => d.date <= asOf);
  }

  async getHourlyForecast(fieldId: string): Promise<WeatherHour[]> {
    const data = await this.fetchForecast(fieldId);
    return this.toWeatherHours(fieldId, data.hourly);
  }

  async getDailyForecast(fieldId: string): Promise<WeatherDayForecast[]> {
    const data = await this.fetchForecast(fieldId);
    return this.toWeatherDayForecasts(fieldId, data.daily);
  }

  private async fetchSeries(
    fieldId: string,
    startDate: IsoDate,
  ): Promise<WeatherDay[]> {
    const field = getField(fieldId);
    if (!field) return [];

    const [longitude, latitude] = field.centroid;
    const url = new URL(this.baseUrl);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", [
      "temperature_2m_max",
      "temperature_2m_min",
      "temperature_2m_mean",
      "relative_humidity_2m_mean",
      "dew_point_2m_mean",
    ].join(","));
    url.searchParams.set("start_date", startDate);
    // Open-Meteo requires end_date to be today or a forecast day; cap at "now".
    url.searchParams.set("end_date", currentIsoDate());
    url.searchParams.set("timezone", "UTC");

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // hourly: daily weather changes once per day
    });
    if (!res.ok) {
      throw new Error(
        `Open-Meteo request failed (${res.status}) for field ${fieldId}`,
      );
    }
    const data = (await res.json()) as OpenMeteoResponse;
    return this.toWeatherDays(fieldId, data.daily, field.crop.baseTempC);
  }

  private toWeatherDays(
    fieldId: string,
    daily: OpenMeteoDaily,
    baseTempC: number,
  ): WeatherDay[] {
    const days: WeatherDay[] = [];
    // Accumulate GDD across the series in chronological order.
    const tempSeries: { maxC: number; minC: number }[] = daily.time.map(
      (_, i) => ({
        maxC: daily.temperature_2m_max[i],
        minC: daily.temperature_2m_min[i],
      }),
    );
    // GDD is cumulative from the START of the series; to get the value for day i
    // we accumulate up to and including i.
    for (let i = 0; i < daily.time.length; i++) {
      if (!isValidDate(daily.time[i])) continue;
      const gddCumulative = computeGddCumulative(
        tempSeries.slice(0, i + 1),
        baseTempC,
      );
      const tempMaxC = round1(daily.temperature_2m_max[i]);
      const tempMinC = round1(daily.temperature_2m_min[i]);
      const tempAvgC = round1(daily.temperature_2m_mean[i]);
      days.push({
        fieldId,
        date: daily.time[i],
        tempMaxC,
        tempMinC,
        tempAvgC,
        gddCumulative,
        dewHours: estimateDewHours(
          tempAvgC,
          round1(daily.dew_point_2m_mean[i]),
        ),
        humidityPct: Math.round(daily.relative_humidity_2m_mean[i]),
      });
    }
    return days;
  }

  /**
   * Fetch the forward-looking forecast (hourly + daily, next 7 days) for a
   * field. Uses `timezone=auto` so the hourly stamps are LOCAL to the field
   * (matches how the weather page labels hours). One request serves both the
   * 48h hourly and the 7-day daily cards. Cached for 30 min: forecast values
   * drift slowly and the BFF layer also caches, but keeping an inner revalidate
   * limits repeat upstream hits during a session.
   */
  private async fetchForecast(
    fieldId: string,
  ): Promise<OpenMeteoForecastResponse> {
    const field = getField(fieldId);
    if (!field) {
      return { hourly: EMPTY_HOURLY, daily: EMPTY_DAILY };
    }

    const [longitude, latitude] = field.centroid;
    const url = new URL(this.baseUrl);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "hourly",
      [
        "temperature_2m",
        "precipitation_probability",
        "precipitation",
        "weather_code",
      ].join(","),
    );
    url.searchParams.set(
      "daily",
      [
        "temperature_2m_max",
        "temperature_2m_min",
        "temperature_2m_mean",
        "precipitation_probability_max",
        "precipitation_sum",
        "weather_code",
        "wind_speed_10m_max",
        "relative_humidity_2m_mean",
      ].join(","),
    );
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "7");

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      throw new Error(
        `Open-Meteo forecast failed (${res.status}) for field ${fieldId}`,
      );
    }
    return (await res.json()) as OpenMeteoForecastResponse;
  }

  /** Map Open-Meteo hourly arrays into WeatherHour[], capped at 48 entries. */
  private toWeatherHours(
    fieldId: string,
    hourly: OpenMeteoHourly,
  ): WeatherHour[] {
    const out: WeatherHour[] = [];
    const cap = Math.min(hourly.time.length, HOURLY_CAP);
    for (let i = 0; i < cap; i++) {
      out.push({
        fieldId,
        // Open-Meteo returns a full local timestamp ("2026-07-23T13"); keep it as
        // the canonical hour key. The page formats it for display.
        time: hourly.time[i],
        tempC: round1(hourly.temperature_2m[i]),
        precipProbPct: Math.round(hourly.precipitation_probability[i]),
        precipMm: round1(hourly.precipitation[i]),
        weatherCode: hourly.weather_code[i],
      });
    }
    return out;
  }

  /**
   * Map Open-Meteo daily arrays into WeatherDayForecast[]. The dominant
   * weather_code for a day is Open-Meteo's own pick (the midday / most severe
   * condition), so we take it verbatim rather than re-deriving.
   */
  private toWeatherDayForecasts(
    fieldId: string,
    daily: OpenMeteoForecastDaily,
  ): WeatherDayForecast[] {
    const out: WeatherDayForecast[] = [];
    for (let i = 0; i < daily.time.length; i++) {
      if (!isValidDate(daily.time[i])) continue;
      out.push({
        fieldId,
        date: daily.time[i],
        tempMaxC: round1(daily.temperature_2m_max[i]),
        tempMinC: round1(daily.temperature_2m_min[i]),
        tempAvgC: round1(daily.temperature_2m_mean[i]),
        precipProbPct: Math.round(daily.precipitation_probability_max[i]),
        precipMm: round1(daily.precipitation_sum[i]),
        weatherCode: daily.weather_code[i],
        windMaxKmh: Math.round(daily.wind_speed_10m_max[i]),
        humidityPct: Math.round(daily.relative_humidity_2m_mean[i]),
      });
    }
    return out;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function currentIsoDate(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}
