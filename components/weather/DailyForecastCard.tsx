import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/icon";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { dayMonthShort, weekdayShort } from "@/lib/utils/format-date";
import { weatherCodeLabel } from "@/lib/weather-codes";
import type { WeatherDayForecast } from "@/lib/types";
import { Drop, Wind } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

/**
 * 7-day daily forecast. One row per day: weekday + date, a WeatherIcon, the
 * min/max temperature range with a normalised track (the dot sits between the
 * week's overall min and max so days are comparable), and precip / wind columns.
 *
 * Numeric values are monospaced with tabular figures (DESIGN.md §3). The first
 * row ("today") is highlighted with teal-light so the anchor day is obvious.
 *
 * Server component: composes data + a client WeatherIcon leaf.
 */
export function DailyForecastCard({ days }: { days: WeatherDayForecast[] }) {
  // Normalise the temp track across the whole week so each day's range is
  // visually comparable (otherwise a uniform 10-20 day looks identical to a
  // uniform 0-10 day).
  const weekMin = Math.min(...days.map((d) => d.tempMinC));
  const weekMax = Math.max(...days.map((d) => d.tempMaxC));
  const weekSpan = Math.max(1, weekMax - weekMin);

  return (
    <Card className="flex flex-col gap-2 p-4 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-ink">
          Prognoza 7-dniowa
        </h3>
        <p className="text-xs text-ink-muted">
          Zakres temperatur, opad i wiatr na każdy dzień
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {days.map((d, i) => (
          <DayRow
            key={d.date}
            day={d}
            isToday={i === 0}
            weekMin={weekMin}
            weekSpan={weekSpan}
          />
        ))}
      </ul>
    </Card>
  );
}

function DayRow({
  day,
  isToday,
  weekMin,
  weekSpan,
}: {
  day: WeatherDayForecast;
  isToday: boolean;
  weekMin: number;
  weekSpan: number;
}) {
  // Position the day's range on the normalised week track, in %.
  const leftPct = ((day.tempMinC - weekMin) / weekSpan) * 100;
  const widthPct = ((day.tempMaxC - day.tempMinC) / weekSpan) * 100;
  const raining = day.precipProbPct >= 40;

  return (
    <li
      className={cn(
        // Mobile: 4 columns (no wind). md+: add the wind column back.
        // min-w-0 on the temp track column lets its inner track shrink instead
        // of forcing the grid to overflow on narrow viewports.
        "grid grid-cols-[4.5rem_1.75rem_minmax(0,1fr)_5.5rem] items-center gap-2.5 px-1 py-2.5 md:grid-cols-[5.5rem_1.75rem_minmax(0,1fr)_5.25rem_4rem] md:gap-3",
        isToday && "rounded-md bg-primary-light",
      )}
    >
      {/* Day + date */}
      <div className="flex flex-col">
        <span className="text-sm font-medium capitalize text-ink">
          {isToday ? "Dziś" : weekdayShort(day.date)}
        </span>
        <span className="text-[11px] capitalize text-ink-muted">
          {dayMonthShort(day.date)}
        </span>
      </div>

      {/* Weather icon */}
      <div
        title={weatherCodeLabel(day.weatherCode)}
        aria-label={weatherCodeLabel(day.weatherCode)}
      >
        <WeatherIcon code={day.weatherCode} size={26} className="text-ink-muted" />
      </div>

      {/* Temperature range track */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-ink-muted sm:w-7">
          {day.tempMinC.toFixed(0)}°
        </span>
        <div className="relative h-1.5 min-w-[2rem] flex-1 rounded-pill bg-surface-2">
          <div
            className="absolute h-full rounded-pill bg-gradient-to-r from-info to-warning"
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 6)}%` }}
          />
        </div>
        <span className="w-6 shrink-0 font-mono text-xs font-semibold tabular-nums text-ink sm:w-7">
          {day.tempMaxC.toFixed(0)}°
        </span>
      </div>

      {/* Precip */}
      <div className="flex items-center justify-end gap-1">
        <Icon
          icon={Drop}
          size={13}
          className={raining ? "text-info" : "text-ink-subtle"}
        />
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            raining ? "text-info" : "text-ink-muted",
          )}
        >
          {day.precipProbPct}%
        </span>
        <span className="hidden font-mono text-[10px] tabular-nums text-ink-subtle xs:inline sm:inline">
          {day.precipMm.toFixed(1)}mm
        </span>
      </div>

      {/* Wind - hidden on mobile, restored at md. */}
      <div className="hidden items-center justify-end gap-1 md:flex">
        <Icon icon={Wind} size={13} className="text-ink-subtle" />
        <span className="font-mono text-xs tabular-nums text-ink-muted">
          {day.windMaxKmh}
        </span>
      </div>
    </li>
  );
}
