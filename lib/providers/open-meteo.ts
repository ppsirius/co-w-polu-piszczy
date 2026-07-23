import { getField } from "@/lib/mock/data";
import { computeGddCumulative } from "@/lib/gdd";
import type { IsoDate, WeatherDay } from "@/lib/types";
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
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function currentIsoDate(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}
