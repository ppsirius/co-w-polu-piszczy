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
import { FIELD_PLACEHOLDER_IMAGE } from "@/lib/images";

/**
 * Dashboard field card (brief §2.C). Full-bleed field photo on top, then the
 * crop/area header, the description note, and aggregated metrics: NDVI with
 * trend, temperature, cumulative GDD, dew hours. Clicking selects the field in
 * the global store and opens the field map view.
 *
 * Metrics are normally loaded client-side via the BFF (/api/fields/[id]/metrics)
 * so provider implementations (incl. Sentinel Hub credentials) stay on the
 * server. That round-trip causes a skeleton flash on first paint even though the
 * dashboard page is a Server Component that could compute the same data up
 * front. When the parent passes `initialMetrics`, the card seeds its state from
 * it and renders loaded immediately - no skeleton. The effect still runs so the
 * card refreshes if `selectedDate` changes later (e.g. the today-lift in the
 * dashboard shell); the parent's SSR data is just the first-paint seed.
 *
 * Layout note: the photo-card pattern puts the media edge-to-edge at the top so
 * the description reads as a caption directly under it (DESIGN.sh §4 health
 * record card - generous padding separates record fields visually).
 */
export function FieldCard({
  field,
  priority = false,
  initialMetrics,
}: {
  field: Field;
  /** Mark the first card above the fold for LCP preloading. */
  priority?: boolean;
  /**
   * Server-precomputed metrics for first paint. Omit to keep the original
   * fetch-on-mount behaviour (e.g. surfaces that aren't Server Components).
   */
  initialMetrics?: FieldMetrics | null;
}) {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedField = useUIStore((s) => s.setSelectedField);
  const router = useRouter();
  const [metrics, setMetrics] = useState<FieldMetrics | null | undefined>(
    initialMetrics,
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
      aria-label={`Otwórz pole ${field.name} na mapie`}
      // `overflow-hidden` lets the top photo hug the card's rounded corners.
      // No `outline-none`: the card is keyboard-focusable, so the global
      // 2px teal focus ring (globals.css) must stay visible (DESIGN.sh a11y).
      className="group flex flex-col gap-0 overflow-hidden p-0"
    >
      {/* Full-bleed field photo. The inner <img> scales on hover for a subtle
          "live preview" cue; reduced-motion users get no zoom (see globals.css). */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
        <Image
          src={FIELD_PLACEHOLDER_IMAGE.src}
          alt={`Zdjęcie pola ${field.name}`}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"
          className="object-cover transition-transform duration-[300ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-semibold text-ink">{field.name}</h3>
            <p className="text-xs text-ink-muted">
              {cropLabel[field.crop.crop]} · {field.areaHa.toFixed(1)} ha
            </p>
          </div>
          <StatusPill status={field.status} />
        </div>

        {/* Description sits directly under the photo + header, the caption the
            photo was missing. Line-clamped so cards stay aligned in the grid. */}
        {field.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {field.description}
          </p>
        )}

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
