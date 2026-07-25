import type { FieldStatus, WeatherCode } from "@/lib/types";

/**
 * WMO weather interpretation code -> Polish label + clinical status.
 *
 * Open-Meteo returns these numeric codes (`weather_code`); they are the
 * canonical WMO 4677 set. We map each to a short Polish label for the UI and a
 * FieldStatus so a paired fg/bg tint + icon can render colour-independently
 * (DESIGN.md §Accessibility: status never by colour alone).
 *
 * Status mapping intent:
 *   clear / partly cloudy / overcast / fog -> info (neutral sky)
 *   drizzle / rain / showers              -> info (wet, not hazardous)
 *   freezing rain / snow                  -> warning (slip / transport risk)
 *   thunderstorm                          -> urgent (severe)
 *
 * Pure + client-safe (no provider import) so icons and labels share one source.
 */
type WeatherCodeMeta = {
  label: string;
  status: FieldStatus;
};

const UNKNOWN: WeatherCodeMeta = { label: "Brak danych", status: "info" };

const MAP: Record<number, WeatherCodeMeta> = {
  0: { label: "Bezchmurnie", status: "info" },
  1: { label: "Głównie bezchmurnie", status: "info" },
  2: { label: "Częściowe zachmurzenie", status: "info" },
  3: { label: "Zachmurzenie", status: "info" },
  45: { label: "Mgła", status: "info" },
  48: { label: "Marznąca mgła", status: "warning" },
  51: { label: "Mżawka (słaba)", status: "info" },
  53: { label: "Mżawka (umiarkowana)", status: "info" },
  55: { label: "Mżawka (silna)", status: "info" },
  56: { label: "Marznąca mżawka", status: "warning" },
  57: { label: "Marznąca mżawka (silna)", status: "warning" },
  61: { label: "Deszcz (słaby)", status: "info" },
  63: { label: "Deszcz (umiarkowany)", status: "info" },
  65: { label: "Deszcz (silny)", status: "info" },
  66: { label: "Marznący deszcz", status: "warning" },
  67: { label: "Marznący deszcz (silny)", status: "warning" },
  71: { label: "Opad śniegu (słaby)", status: "warning" },
  73: { label: "Opad śniegu (umiarkowany)", status: "warning" },
  75: { label: "Opad śniegu (silny)", status: "warning" },
  77: { label: "Krupy śnieżne", status: "warning" },
  80: { label: "Przelotny deszcz", status: "info" },
  81: { label: "Przelotny deszcz (umiarkowany)", status: "info" },
  82: { label: "Przelotny deszcz (silny)", status: "warning" },
  85: { label: "Przelotny opad śniegu", status: "warning" },
  86: { label: "Przelotny opad śniegu (silny)", status: "warning" },
  95: { label: "Burza", status: "urgent" },
  96: { label: "Burza z gradem", status: "urgent" },
  99: { label: "Burza z gradem (silna)", status: "urgent" },
};

/** Polish label for a WMO code. */
export function weatherCodeLabel(code: WeatherCode): string {
  return (MAP[code] ?? UNKNOWN).label;
}
