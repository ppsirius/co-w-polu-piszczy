import type { IsoDate } from "@/lib/types";

/**
 * Date-arithmetic helpers for the canonical ISO date (`YYYY-MM-DD`).
 *
 * All date math in the app is anchored at UTC midnight (`"YYYY-MM-DDT00:00:00Z"`)
 * so shifts never drift across local timezone boundaries.
 */

/**
 * Shift an ISO date by `days` (which may be negative). Returns the resulting
 * `YYYY-MM-DD`, computed at UTC midnight via `setUTCDate` so calendar dates roll
 * correctly across month / year boundaries (e.g. `addDays("2026-03-31", 1)`
 * is `"2026-04-01"`, not a ms-overflow approximation).
 */
export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}
