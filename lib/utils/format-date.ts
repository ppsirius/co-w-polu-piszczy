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
