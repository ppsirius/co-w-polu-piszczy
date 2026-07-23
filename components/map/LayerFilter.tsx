"use client";

import { useUIStore } from "@/lib/store";
import { layerLabel } from "@/lib/labels";
import type { MapLayer } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const LAYERS: MapLayer[] = ["none", "ndvi", "temperature", "gdd", "moisture", "dew"];

/**
 * Quick layer filters (brief §2.B). Pill grid: available = teal-light,
 * selected = teal (scheduling-flow pattern, DESIGN.sh §4).
 */
export function LayerFilter() {
  const layer = useUIStore((s) => s.layer);
  const setLayer = useUIStore((s) => s.setLayer);

  return (
    <div
      role="radiogroup"
      aria-label="Warstwa danych"
      className="flex items-center gap-1 rounded-md border border-border bg-canvas p-1"
    >
      {LAYERS.map((l) => {
        const selected = layer === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setLayer(l)}
            className={cn(
              "min-h-8 rounded-sm px-2.5 text-xs font-medium transition-colors duration-[100ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              selected
                ? "bg-primary text-on-primary"
                : "text-ink-muted hover:bg-primary-light hover:text-primary",
            )}
          >
            {layerLabel[l]}
          </button>
        );
      })}
    </div>
  );
}
