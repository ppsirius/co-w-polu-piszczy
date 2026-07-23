import { dailyForecast, hourlyForecast, weatherDays } from "@/lib/mock/data";
import type { IWeatherProvider } from "@/lib/providers/types";

/** Mock weather provider: serves the in-memory weather datasets. */
export class MockWeatherProvider implements IWeatherProvider {
  async getWeatherSeries(fieldId: string) {
    return weatherDays
      .filter((w) => w.fieldId === fieldId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getWeatherAt(
    fieldId: string,
    asOf: import("@/lib/types").IsoDate,
  ) {
    const series = await this.getWeatherSeries(fieldId);
    return [...series].reverse().find((w) => w.date <= asOf);
  }

  async getHourlyForecast(fieldId: string) {
    return hourlyForecast(fieldId);
  }

  async getDailyForecast(fieldId: string) {
    return dailyForecast(fieldId);
  }
}
