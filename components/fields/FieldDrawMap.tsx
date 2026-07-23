"use client";

import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { MAPBOX_TOKEN, hasMapboxToken } from "@/lib/mapbox";
import { toFieldPolygon } from "@/lib/geometry";
import { fields as seedFields } from "@/lib/mock/data";
import type { FieldPolygon } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { MapPin } from "@phosphor-icons/react";

/**
 * Interactive polygon editor backed by mapbox-gl + MapboxDraw (v1.5.1).
 *
 * Two modes, selected once at mount via `initialPolygon`:
 * - No initial polygon (create): starts in `draw_polygon` so the first clicks
 *   lay down vertices; finishing the shape fires `draw.create`.
 * - Initial polygon present (edit): the feature is added with a stable id, then
 *   we switch to `direct_select` so existing vertices/edges are draggable and
 *   midpoints can add vertices; the trash control deletes selected ones.
 *
 * Whenever the geometry changes (`draw.create` / `draw.update` / `draw.delete`)
 * we normalize the draw feature into the app's `FieldPolygon` and call
 * `onChange`. The parent computes area/centroid from it for the live readout.
 *
 * Note: programmatic Draw calls (add / changeMode / delete) do NOT re-fire the
 * event that directly corresponds to them (per the Draw docs), so we only rely
 * on user-driven events to propagate geometry — the seed feature we add in edit
 * mode is read back via the same normalization path on first change.
 */
export function FieldDrawMap({
  initialPolygon,
  locateUser = false,
  onChange,
}: {
  initialPolygon?: FieldPolygon | null;
  /** Request browser geolocation and center on it (used for new fields). */
  locateUser?: boolean;
  onChange: (polygon: FieldPolygon | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !hasMapboxToken()) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Center on the seed fields' bounds, or on the initial polygon if editing.
    const boundsSource =
      initialPolygon?.coordinates[0] ??
      seedFields.flatMap((f) => f.polygon.coordinates[0]);
    const lngs = boundsSource.map((b) => b[0]);
    const lats = boundsSource.map((b) => b[1]);
    const center: [number, number] = [
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
      (Math.min(...lats) + Math.max(...lats)) / 2,
    ];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center,
      zoom: initialPolygon ? 15 : 13,
    });
    mapRef.current = map;

    // For a new field, try to center the map on the browser's geolocation so
    // the user can draw where they actually are. Non-blocking: if permission
    // is denied/unavailable, the map keeps its seed-bounds center. Once the
    // position arrives we fly there (the map is interactive, so this is a
    // convenience, not a hard dependency).
    if (locateUser && !initialPolygon && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapRef.current?.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 16,
          });
        },
        () => {
          /* denied/unavailable — keep seed-bounds center */
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
      );
    }

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: initialPolygon ? "simple_select" : "draw_polygon",
      styles: drawStyles,
    });
    drawRef.current = draw;
    map.addControl(draw, "top-left");

    const emitCurrent = () => {
      const all = draw.getAll();
      const feature = all.features.find((f) => f.geometry.type === "Polygon");
      onChange(toFieldPolygon(feature?.geometry));
    };

    const onCreate = () => emitCurrent();
    const onUpdate = () => emitCurrent();
    const onDelete = () => emitCurrent();

    map.on("draw.create", onCreate);
    map.on("draw.update", onUpdate);
    map.on("draw.delete", onDelete);

    // Seed an existing polygon for editing. add() does not fire an event.
    if (initialPolygon) {
      map.on("load", () => {
        const ids = draw.add({
          type: "Feature",
          properties: {},
          geometry: initialPolygon,
        });
        const id = ids[0];
        if (id) {
          draw.changeMode("direct_select", { featureId: id });
          // Emit once so the parent has the initial geometry/area immediately.
          emitCurrent();
        }
      });
    }

    return () => {
      map.off("draw.create", onCreate);
      map.off("draw.update", onUpdate);
      map.off("draw.delete", onDelete);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasMapboxToken()) {
    return <DrawMissingToken />;
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function DrawMissingToken() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 bg-surface-1 p-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-bg text-warning">
        <Icon icon={MapPin} size={20} />
      </span>
      <p className="text-sm text-ink-muted">
        Rysowanie kształtu wymaga tokenu Mapbox
        (<code className="font-mono text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code>).
      </p>
    </div>
  );
}

/**
 * Custom Draw styles so the editing vertices/edges read clearly on top of the
 * satellite basemap (high-contrast white fill + teal outline + white handles).
 * MapboxDraw expects a flat array of style spec objects keyed by layer id.
 */
const drawStyles: mapboxgl.LayerSpecification[] = [
  // Fill
  {
    id: "draw-fill",
    type: "fill",
    paint: {
      "fill-color": "#0a9e8f",
      "fill-opacity": 0.25,
    },
  } as mapboxgl.FillLayerSpecification,
  // Outline
  {
    id: "draw-line",
    type: "line",
    paint: {
      "line-color": "#0a9e8f",
      "line-width": 2,
    },
  } as mapboxgl.LineLayerSpecification,
  // Vertex handles
  {
    id: "draw-vertices",
    type: "circle",
    paint: {
      "circle-radius": 5,
      "circle-color": "#ffffff",
      "circle-stroke-color": "#0a9e8f",
      "circle-stroke-width": 2,
    },
  } as mapboxgl.CircleLayerSpecification,
];
