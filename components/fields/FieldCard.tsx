"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { MetricTile } from "@/components/ui/MetricTile";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUIStore } from "@/lib/store";
import type { Field, FieldMetrics } from "@/lib/types";
import { cropLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils/format-date";

/**
 * Dashboard field card (brief §2.C). Sensor thumbnail + aggregated metrics:
 * temperature, GDD, dew hours, NDVI with trend. Clicking selects the field
 * in the global store and opens the field map view.
 *
 * Metrics are loaded client-side via the BFF (/api/fields/[id]/metrics) so the
 * provider implementations (incl. Sentinel Hub credentials) stay on the server.
 * A skeleton matches the final layout while loading.
 */
export function FieldCard({ field }: { field: Field }) {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedField = useUIStore((s) => s.setSelectedField);
  const router = useRouter();
  const [metrics, setMetrics] = useState<FieldMetrics | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ date: selectedDate });
    fetch(`/api/fields/${field.id}/metrics?${params.toString()}`)
      .then((r) => (r.ok ? (r.json() as Promise<FieldMetrics & { error?: string }>) : null))
      .then((m) => {
        if (active && m && !m.error) setMetrics(m);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [field.id, selectedDate]);

  const loading = metrics === undefined;

  function openOnMap() {
    setSelectedField(field.id);
    router.push(`/map?field=${field.id}`);
  }

  return (
    <Card
      interactive
      as="article"
      onClick={openOnMap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openOnMap();
        }
      }}
      tabIndex={0}
      className="flex flex-col gap-4 p-5 outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold text-ink">{field.name}</h3>
          <p className="text-xs text-ink-muted">
            {cropLabel[field.crop.crop]} · {field.areaHa.toFixed(1)} ha
          </p>
        </div>
        <StatusPill status={field.status} />
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-surface-2">
        <Image
          src={`https://picsum.photos/seed/${field.id}-${selectedDate}/640/360`}
          alt={`Zdjęcie pola ${field.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
        />
      </div>

      {loading ? (
        <CardSkeleton />
      ) : metrics ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <MetricTile
            label="NDVI"
            value={metrics.ndvi.current.toFixed(2)}
            trend={metrics.ndvi.trend}
          />
          <MetricTile
            label="Temperatura"
            value={metrics.weather.tempAvgC.toFixed(0)}
            unit="°C"
          />
          <MetricTile
            label="GDD skumul."
            value={String(metrics.weather.gddCumulative)}
          />
          <MetricTile
            label="Rosa"
            value={String(metrics.weather.dewHours)}
            unit="h"
          />
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Brak danych dla wybranej daty.</p>
      )}

      <div className="border-t border-border pt-3">
        <span className="font-mono text-[11px] text-ink-subtle">
          Ostatni odczyt: {formatDate(selectedDate)}
        </span>
      </div>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}