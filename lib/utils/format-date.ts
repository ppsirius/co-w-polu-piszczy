import type { IsoDate } from "@/lib/types";

/**
 * Format an ISO calendar date (YYYY-MM-DD) as a Polish long date, e.g.
 * "15 czerwca 2026". Client-safe (uses the runtime Intl locale). Shared so the
 * legend, field cards, and any future surface render dates consistently.
 */
export function formatDate(iso: IsoDate): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Polish short weekday for an ISO date, e.g. "pon", "wt". Client-safe.
 */
export function weekdayShort(iso: IsoDate): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", { weekday: "short" });
}

/**
 * Polish short date with day + month, e.g. "15 cze". Client-safe.
 */
export function dayMonthShort(iso: IsoDate): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });
}

/**
 * Hour label from a local ISO hour stamp ("2026-07-23T13") -> "13:00".
 * Parses without a timezone suffix so it stays anchored to the field-local hour
 * the provider returned (no UTC shift). Client-safe.
 */
export function hourLabel(time: string): string {
  const d = new Date(`${time}:00`);
  return d.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
