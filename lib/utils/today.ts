import type { IsoDate } from "@/lib/types";

/**
 * Today's date as ISO YYYY-MM-DD, in UTC (matches the rest of the app - all
 * date math uses `toISOString().slice(0, 10)` and `T00:00:00Z` suffixes, so a
 * local-timezone split here would clash).
 *
 * NOTE: this is non-deterministic (depends on the runtime clock), so it MUST
 * NOT be read during static render - pages under (dashboard) are prerendered
 * and a build-time date would cause a React hydration mismatch. Use the
 * `useTodayIso()` hook on the client, or call this directly inside route
 * handlers (server-only, per-request).
 */
export function todayIso(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}
