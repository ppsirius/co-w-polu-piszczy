"use client";

import { useUIStore } from "@/lib/store";
import { layerLabel } from "@/lib/labels";
import { layerMeta } from "@/lib/layer-meta";

/**
 * Map legend overlay: shows the active layer's color scale + data-source
 * attribution. Anchored bottom-left of the map so it never competes with the
 * top toolbar. Reads the active layer from the global store (same source as the
 * LayerFilter pills).
 *
 * For the NDVI raster layer the legend describes the satellite imagery ramp;
 * for zonal layers it mirrors the polygon color helpers in lib/geojson.ts.
 */
export function LayerLegend() {
  const layer = useUIStore((s) => s.layer);
  const meta = layerMeta[layer];

  // No overlay on the plain basemap -> no legend.
  if (layer === "none") return null;

  return (
    <div
      role="figure"
      aria-label={`Legenda: ${layerLabel[layer]}`}
      className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-border bg-canvas/95 p-2.5 shadow-overlay backdrop-blur-sm"
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink">
          {layerLabel[layer]}
          {meta.unit ? (
            <span className="ml-1 text-[11px] font-normal text-ink-muted">
              ({meta.unit})
            </span>
          ) : null}
        </span>
      </div>

      {/* Gradient bar: stop colors blended left -> right. */}
      <div
        className="h-2 w-48 rounded-sm"
        style={{
          background: `linear-gradient(to right, ${meta.stops
            .map((s, i) => `${s.color} ${(i / (meta.stops.length - 1)) * 100}%, ${s.color} ${((i + 1) / (meta.stops.length)) * 100}%`)
            .join(", ")})`,
        }}
      />

      {/* Endpoint labels only (low / high): cramming all stop labels into one
          row made them overlap, especially NDVI's word labels. The gradient
          conveys the in-between values; the endpoints anchor the scale. */}
      {meta.stops.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] font-mono text-ink-muted">
          <span>{meta.stops[0].label}</span>
          <span>{meta.stops[meta.stops.length - 1].label}</span>
        </div>
      )}

      <div className="mt-1.5 border-t border-border pt-1 text-[10px] text-ink-subtle">
        {meta.source}
        {meta.raster ? " · obraz" : ""}
      </div>
    </div>
  );
}
