"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { SelectInput } from "@/components/ui/SelectInput";
import { HourlyForecastCard } from "@/components/weather/HourlyForecastCard";
import { DailyForecastCard } from "@/components/weather/DailyForecastCard";
import { fields as seedFields } from "@/lib/mock/data";
import { useFieldsStore, useFieldsHydrated } from "@/lib/fields-store";
import type { FieldForecast } from "@/lib/types";

/**
 * Weather page body (brief: per-field forecast, 48h hourly + 7-day daily).
 *
 * Field selection reads the persisted fields store with the same hydrated+seed
 * pattern as the sensors/field-management pages: the seed list renders on first
 * paint (SSR-safe), then swaps to the persisted list once the client rehydrates
 * localStorage. A default field (the first one) is always selected so the page
 * never renders empty.
 *
 * The forecast is fetched client-side via the BFF so provider credentials
 * (Open-Meteo base URL / future keys) stay server-only. A matching skeleton
 * fills the layout while loading; an explicit error state shows when the fetch
 * fails (DESIGN.md §4.5 - full interactive states, not just success).
 */
export function WeatherView() {
  const rehydrate = useFieldsStore((s) => s.rehydrate);
  const hydrated = useFieldsHydrated();
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const storeFields = useFieldsStore((s) => s.fields);
  const fields = hydrated ? storeFields : seedFields;

  // Default to the first field. Kept in local state (not the global UI store)
  // because weather selection is page-scoped, not cross-page.
  const [fieldId, setFieldId] = useState<string>("");
  const resolvedId = fieldId || fields[0]?.id || "";
  const field = useMemo(
    () => fields.find((f) => f.id === resolvedId),
    [fields, resolvedId],
  );

  const [forecast, setForecast] = useState<FieldForecast | null | undefined>(
    undefined,
  );

  // Refetch whenever the resolved field changes. Cancels stale in-flight
  // requests on cleanup so a fast field switch can't clobber the latest fetch.
  // Loading is DERIVED (forecast belongs to a different field than resolvedId)
  // rather than set synchronously in the effect, which would cause cascading
  // renders.
  useEffect(() => {
    if (!resolvedId) return;
    let active = true;
    fetch(`/api/fields/${resolvedId}/forecast`)
      .then((r) => (r.ok ? (r.json() as Promise<FieldForecast>) : null))
      .then((data) => {
        if (active) setForecast(data);
      })
      .catch(() => {
        if (active) setForecast(null);
      });
    return () => {
      active = false;
    };
  }, [resolvedId]);

  const loading =
    forecast === undefined || forecast?.fieldId !== resolvedId;

  // Centroid is [lng, lat]; display lat, lng (human convention).
  const [lng, lat] = field?.centroid ?? [0, 0];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 p-4 sm:gap-6 sm:p-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Pogoda
          </h2>
          <p className="text-sm text-ink-muted">
            Prognoza pogody dla wybranego pola na podstawie jego lokalizacji.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <SelectInput
            label="Pole"
            value={resolvedId}
            onChange={(e) => setFieldId(e.target.value)}
            options={fields.map((f) => ({ value: f.id, label: f.name }))}
          />
        </div>

        {field && (
          <p className="font-mono text-[11px] text-ink-subtle">
            Lokalizacja: {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        )}
      </header>

      {loading ? (
        <ForecastSkeleton />
      ) : forecast && (forecast.hourly.length > 0 || forecast.daily.length > 0) ? (
        <div className="flex flex-col gap-6">
          {forecast.hourly.length > 0 && (
            <HourlyForecastCard hours={forecast.hourly} />
          )}
          {forecast.daily.length > 0 && (
            <DailyForecastCard days={forecast.daily} />
          )}
        </div>
      ) : (
        <Card className="p-8">
          <p className="text-sm text-ink-muted">
            Brak dostępnej prognozy dla tego pola.
          </p>
        </Card>
      )}
    </div>
  );
}

/** Loading skeleton matching the two-card layout (DESIGN.md §6). */
function ForecastSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-5">
        <Skeleton className="h-5 w-44" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[124px] w-[68px] shrink-0" />
          ))}
        </div>
      </Card>
      <Card className="flex flex-col gap-4 p-5">
        <Skeleton className="h-5 w-36" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
