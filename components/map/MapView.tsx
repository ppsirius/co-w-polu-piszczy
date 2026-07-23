"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { MAPBOX_TOKEN, hasMapboxToken } from "@/lib/mapbox";
import {
  type LayerValues,
  type MapLayerValuesResponse,
  fieldFeatures,
  pickLayerValues,
  sensorFeatures,
} from "@/lib/geojson";
import { useUIStore } from "@/lib/store";
import { useFields } from "@/lib/fields-store";
import { sensorKindLabel } from "@/lib/labels";
import { Icon } from "@/components/ui/icon";
import { LinkIcon, MapPin } from "@phosphor-icons/react";

/** Mapbox layer/source ids for the NDVI satellite imagery overlay. */
const NDVI_RASTER_SOURCE = "ndvi-tiles";
const NDVI_RASTER_LAYER = "ndvi-raster";
/** Raster tiles are served by our token-injecting proxy, not Sentinel Hub. */
const ndviTileUrl = (date: string) =>
  `/api/tiles/ndvi/{z}/{x}/{y}?date=${encodeURIComponent(date)}`;

/**
 * Mapbox GL map. SSR-safe: the library touches `window`, so it is only
 * instantiated inside useEffect (client-only). Renders field polygons colored
 * by the active layer and sensor markers with popups showing the latest
 * thumbnail + NDVI. Reads layer/date from the global store.
 *
 * Two render modes:
 *  - NDVI: a Sentinel-2 RASTER overlay (real intra-field imagery) drawn via the
 *    /api/tiles/ndvi token-injecting proxy; polygon fills are hidden, outlines
 *    stay. Falls back to polygon fill if no imagery (mock / cloudy date).
 *  - Other layers: per-field colored polygons from /api/map/layers values.
 *
 * Layer VALUES are fetched once per date from /api/map/layers (all layers in a
 * single payload) and held in a ref; toggling the active layer just recolors
 * client-side from that cached payload (no refetch). Polygons render in the
 * no-data tint until values arrive (skeleton-first convention).
 */
export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layer = useUIStore((s) => s.layer);
  const selectedDate = useUIStore((s) => s.selectedDate);
  const selectedFieldId = useUIStore((s) => s.selectedFieldId);
  const fields = useFields();
  // Full per-field, per-layer payload from the BFF. Ref so the layer-recompute
  // effect can read it without itself being a dependency.
  const valuesRef = useRef<MapLayerValuesResponse>({});
  // Bump to trigger a recolor after a fetch completes.
  const [valuesVersion, setValuesVersion] = useState(0);

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !hasMapboxToken()) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const bounds: [number, number][] = fields.flatMap((f) =>
      f.polygon.coordinates[0],
    );
    const lngs = bounds.map((b) => b[0]);
    const lats = bounds.map((b) => b[1]);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2,
      ],
      zoom: 13,
    });
    mapRef.current = map;

    map.on("load", () => {
      // --- Fields (polygons colored by active layer) ---
      // Seed with empty values; polygons render in the no-data tint until the
      // BFF payload arrives, then the recompute effect repaints them.
      map.addSource("fields", {
        type: "geojson",
        data: fieldFeatures(layer, fields, {}),
      });
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        // Color is precomputed per field in geojson.ts (one ramp per layer),
        // so the same expression works for every layer without recalibration.
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.45,
        },
      });
      map.addLayer({
        id: "fields-outline",
        type: "line",
        source: "fields",
        paint: {
          "line-color": "#FFFFFF",
          "line-width": 1.5,
        },
      });
      // Selected-field highlight (teal, drawn above the base outline so the
      // choice made on the dashboard is visible after the card click nav).
      map.addLayer({
        id: "fields-selected",
        type: "line",
        source: "fields",
        filter: ["==", ["get", "fieldId"], selectedFieldId ?? ""],
        paint: {
          "line-color": "#0A9E8F",
          "line-width": 3,
        },
      });

      // --- Sensor markers ---
      for (const feature of sensorFeatures().features) {
        const [lng, lat] = feature.geometry.coordinates;
        const p = feature.properties;
        if (!p) continue;

        // Outer element is positioned by Mapbox via its own transform.
        // Put ALL hover effects on an inner child so they never clobber the
        // marker's translate(x, y) - that was causing the jump on hover.
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "flex h-7 w-7 items-center justify-center rounded-full bg-transparent p-0 border-0 cursor-pointer";
        el.setAttribute("aria-label", `Czujnik ${p.name}`);

        const inner = document.createElement("span");
        inner.className =
          "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-on-primary shadow-elevated transition-transform duration-[100ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-110";
        inner.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor"><path d="M128,64a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64Zm0,112a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,176Z"/></svg>';
        el.appendChild(inner);

        const popup = new mapboxgl.Popup({ offset: 18, maxWidth: "260px" }).setHTML(
          renderSensorPopup(
            p.name,
            sensorKindLabel[p.kind as keyof typeof sensorKindLabel] ?? p.kind,
            p.batteryPct,
          ),
        );
        new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all-layer values for the selected date from the BFF. One request per
  // date change; layer toggles read from the cached payload (no refetch).
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ date: selectedDate });
    fetch(`/api/map/layers?${params.toString()}`)
      .then((r) => (r.ok ? (r.json() as Promise<MapLayerValuesResponse>) : {}))
      .then((all) => {
        if (!active) return;
        valuesRef.current = all;
        setValuesVersion((v) => v + 1);
      })
      .catch(() => {
        // Leave the previous values in place; polygons show the no-data tint.
      });
    return () => {
      active = false;
    };
  }, [selectedDate]);

  // Single source of truth for the active layer mode. Three mutually exclusive
  // modes, each idempotent (guards every add/remove with an existence check) so
  // rapid switching can never leave a stale layer stuck on:
  //   - "ndvi":      Sentinel-2 raster overlay; polygon fill HIDDEN (imagery
  //                  carries the data), outlines stay.
  //   - "none":      plain basemap; raster HIDDEN, fill shown as a SUBTLE neutral
  //                  tint so fields stay visible against the satellite imagery.
  //   - zonal layer: per-field colored polygons from /api/map/layers values;
  //                  raster HIDDEN, fill VISIBLE at full opacity.
  // Consolidated from two racing effects that could leave the NDVI raster
  // stuck on after switching layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showFill = (values: LayerValues, opacity: number) => {
      const source = map.getSource("fields") as mapboxgl.GeoJSONSource | undefined;
      source?.setData(fieldFeatures(layer, fields, values));
      map.setPaintProperty("fields-fill", "fill-opacity", opacity);
      map.setLayoutProperty("fields-fill", "visibility", "visible");
    };

    const hideFill = () => {
      map.setLayoutProperty("fields-fill", "visibility", "none");
    };

    const showRaster = () => {
      // Rebuild only if missing OR the tile URL (date) changed.
      const existing = map.getSource(NDVI_RASTER_SOURCE) as
        | mapboxgl.RasterTileSource
        | undefined;
      const desiredUrl = ndviTileUrl(selectedDate);
      if (existing) {
        // Date changed while on NDVI: swap the tile URL in place.
        existing.setTiles([desiredUrl]);
        return;
      }
      map.addSource(NDVI_RASTER_SOURCE, {
        type: "raster",
        tiles: [desiredUrl],
        tileSize: 256,
      });
      map.addLayer(
        {
          id: NDVI_RASTER_LAYER,
          type: "raster",
          source: NDVI_RASTER_SOURCE,
          paint: { "raster-opacity": 0.7 },
        },
        "fields-outline",
      );
    };

    const hideRaster = () => {
      if (map.getLayer(NDVI_RASTER_LAYER)) map.removeLayer(NDVI_RASTER_LAYER);
      if (map.getSource(NDVI_RASTER_SOURCE)) map.removeSource(NDVI_RASTER_SOURCE);
    };

    const update = () => {
      if (layer === "ndvi") {
        showRaster();
        hideFill();
      } else if (layer === "none") {
        // Plain basemap: no data overlay, but a subtle neutral fill so fields
        // read clearly against the satellite imagery.
        hideRaster();
        showFill({}, 0.18);
      } else {
        hideRaster();
        showFill(pickLayerValues(valuesRef.current, layer), 0.45);
      }
    };
    if (map.loaded()) update();
    else map.once("load", update);
  }, [layer, selectedDate, fields, valuesVersion]);

  // Highlight the selected field and fly to it when the dashboard card click
  // (or any other selection) changes selectedFieldId.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      map.setFilter("fields-selected", [
        "==",
        ["get", "fieldId"],
        selectedFieldId ?? "",
      ]);
      const target = fields.find((f) => f.id === selectedFieldId);
      if (target) {
        const ring = target.polygon.coordinates[0];
        const lngs = ring.map((c) => c[0]);
        const lats = ring.map((c) => c[1]);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, duration: 600 },
        );
      }
    };
    if (map.loaded()) update();
    else map.once("load", update);
  }, [selectedFieldId, fields]);

  if (!hasMapboxToken()) {
    return <MissingTokenNotice />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function renderSensorPopup(
  name: string,
  kind: string,
  batteryPct: number,
): string {
  return `
    <div style="font-family:var(--font-inter),sans-serif;padding:4px;min-width:220px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="display:inline-flex;width:28px;height:28px;border-radius:9999px;background:#E6F6F5;color:#0A9E8F;align-items:center;justify-content:center;font-size:14px;">📍</span>
        <div>
          <div style="font-size:14px;font-weight:600;color:#111827;">${name}</div>
          <div style="font-size:12px;color:#6B7280;">${kind}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B7280;border-top:1px solid #E5E7EB;padding-top:6px;">
        <span>Bateria</span>
        <span style="font-family:var(--font-jetbrains-mono),monospace;color:#111827;">${batteryPct}%</span>
      </div>
    </div>`;
}

function MissingTokenNotice() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-bg text-warning">
        <Icon icon={MapPin} size={24} />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-ink">
          Brak tokenu Mapbox
        </h3>
        <p className="max-w-sm text-sm text-ink-muted">
          Dodaj publiczny token Mapbox do pliku{" "}
          <code className="font-mono text-xs">.env.local</code> jako{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code>,
          a następnie uruchom serwer ponownie.
        </p>
      </div>
      <a
        href="https://account.mapbox.com/access-tokens/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
      >
        <Icon icon={LinkIcon} size={14} />
        Pobierz token
      </a>
    </div>
  );
}
