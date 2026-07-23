import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/icon";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { hourLabel } from "@/lib/utils/format-date";
import { weatherCodeLabel } from "@/lib/weather-codes";
import type { WeatherHour } from "@/lib/types";
import { Drop } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

/**
 * 48-hour hourly forecast (brief: temperature + rain probability).
 *
 * Horizontal-scroll strip of hour tiles, matching the MetricTile aesthetic:
 * mono numeric values (tabular figures), a Drop icon + precip% with a mini bar
 * whose width tracks the probability. The first tile (the current hour) is
 * highlighted with the teal-light fill so "now" is findable at a glance.
 *
 * Server component: it only composes data + a client WeatherIcon leaf.
 */
export function HourlyForecastCard({ hours }: { hours: WeatherHour[] }) {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold text-ink">
            Najbliższe 48 godzin
          </h3>
          <p className="text-xs text-ink-muted">
            Temperatura i prawdopodobieństwo opadu co godzinę
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-ink-subtle">
          {hours.length} godz.
        </span>
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        role="list"
        aria-label="Prognoza godzinowa"
      >
        {hours.map((h, i) => (
          <HourTile key={h.time} hour={h} isNow={i === 0} />
        ))}
      </div>
    </Card>
  );
}

function HourTile({ hour, isNow }: { hour: WeatherHour; isNow: boolean }) {
  const { tempC, precipProbPct, precipMm, weatherCode, time } = hour;
  // Bar height tracks precip probability; capped so a 100% bar never overflows.
  const barH = Math.max(2, Math.round((precipProbPct / 100) * 28));
  const raining = precipProbPct >= 40;

  return (
    <div
      role="listitem"
      className={cn(
        "flex w-[60px] shrink-0 flex-col items-center gap-2 rounded-lg border p-2 transition-colors sm:w-[68px]",
        isNow
          ? "border-primary bg-primary-light"
          : "border-border bg-surface-1",
      )}
    >
      <span className="text-xs font-medium text-ink-muted">
        {isNow ? "Teraz" : hourLabel(time)}
      </span>

      <WeatherIcon code={weatherCode} size={24} className="text-ink-muted" />

      <span className="font-mono text-base font-semibold tabular-nums text-ink">
        {tempC.toFixed(0)}
        <span className="text-xs text-ink-muted">°C</span>
      </span>

      <div
        className="flex h-8 w-full items-end justify-center"
        title={`Prawdopodobieństwo opadu: ${precipProbPct}%${
          precipMm > 0 ? ` · ${precipMm.toFixed(1)} mm` : ""
        }`}
        aria-label={weatherCodeLabel(weatherCode)}
      >
        <div
          className={cn(
            "w-2 rounded-pill",
            raining ? "bg-info" : "bg-surface-2",
          )}
          style={{ height: `${barH}px` }}
        />
      </div>

      <div className="flex items-center gap-0.5">
        <Icon
          icon={Drop}
          size={11}
          className={raining ? "text-info" : "text-ink-subtle"}
        />
        <span
          className={cn(
            "font-mono text-[11px] tabular-nums",
            raining ? "text-info" : "text-ink-muted",
          )}
        >
          {precipProbPct}%
        </span>
      </div>
    </div>
  );
}
