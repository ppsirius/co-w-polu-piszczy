/**
 * Growing Degree Days (GDD / sum temperatur efektywnych).
 *
 * GDD is not fetched from a weather API - it is DERIVED from daily min/max
 * temperatures and a crop-specific base temperature. This util is the single
 * source of truth for the accumulation formula so mock and live data agree.
 *
 * Formula (simple averaging method, matches the mock in lib/mock/data.ts):
 *   dailyGdd = max(0, ((Tmax + Tmin) / 2) - baseTempC)
 * and the cumulative value is the running sum of `dailyGdd` from sowing.
 */

/** One day's temperatures, enough to compute a daily GDD increment. */
export type DailyTemp = {
  /** Daily maximum, degrees Celsius. */
  maxC: number;
  /** Daily minimum, degrees Celsius. */
  minC: number;
};

/** Daily GDD increment (single-sine would need more inputs; this is the averaging method). */
export function dailyGdd({ maxC, minC }: DailyTemp, baseTempC: number): number {
  const avg = (maxC + minC) / 2;
  return Math.max(0, avg - baseTempC);
}

/**
 * Cumulative GDD across a series of daily temperatures, in chronological order.
 * Rounds each daily increment toward zero (truncates) to match the mock, then
 * sums the integers.
 */
export function computeGddCumulative(
  daily: DailyTemp[],
  baseTempC: number,
): number {
  return daily.reduce(
    (sum, day) => sum + (dailyGdd(day, baseTempC) | 0),
    0,
  );
}
