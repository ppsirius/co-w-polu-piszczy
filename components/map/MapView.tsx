"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { MAPBOX_TOKEN, hasMapboxToken } from "@/lib/mapbox";
import { fieldFeatures, sensorFeatures } from "@/lib/geojson";
import { useUIStore } from "@/lib/store";
import { useFields } from "@/lib/fields-store";
import { sensorKindLabel } from "@/lib/labels";
import { Icon } from "@/components/ui/icon";
import { LinkIcon, MapPin } from "@phosphor-icons/react";

/**
 * Mapbox GL map. SSR-safe: the library touches `window`, so it is only
 * instantiated inside useEffect (client-only). Renders field polygons colored
 * by the active layer (NDVI scale by default) and sensor markers with popups
 * showing the latest thumbnail + NDVI. Reads layer/date from the global store.
 *
 * The field source's data is re-derived whenever the active layer changes.
 */
export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layer = useUIStore((s) => s.layer);
  const fields = useFields();

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
      map.addSource("fields", {
        type: "geojson",
        data: fieldFeatures(layer, fields),
      });
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "layerValue"], null],
            "#9CA3AF",
            // Only NDVI uses the ramp today; other layers fall back to teal.
            [
              "step",
              ["get", "layerValue"],
              "#92400E",
              0.2,
              "#CA8A04",
              0.4,
              "#A3A320",
              0.6,
              "#4D7C0F",
              0.75,
              "#059669",
            ],
          ],
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

  // Re-derive field data when the active layer OR the fields list changes
  // (e.g. a field added/edited/deleted on field-management).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const source = map.getSource("fields") as
        | mapboxgl.GeoJSONSource
        | undefined;
      source?.setData(fieldFeatures(layer, fields));
    };
    if (map.loaded()) update();
    else map.once("load", update);
  }, [layer, fields]);

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
