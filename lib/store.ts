"use client";

import { create } from "zustand";
import type { IsoDate, MapLayer } from "@/lib/types";
import { TODAY } from "@/lib/mock/data";

/**
 * Global UI state. Per the brief (§1, §2.B), changing the date in the main
 * panel must propagate to every component that queries data, and the selected
 * polygon drives both the map and the dashboard. Zustand keeps this outside
 * React's render tree so any component can read/subscribe without prop drilling.
 */
type UIState = {
  /** Currently focused field. Null = no field selected (overview). */
  selectedFieldId: string | null;
  /** Global date - drives all time-scoped queries. */
  selectedDate: IsoDate;
  /** Active map layer. */
  layer: MapLayer;
  /** Currently inspected sensor (image timeline view). */
  selectedSensorId: string | null;
  /**
   * The real clock "today", used as the upper bound of the date selector.
   * Seeded with the frozen mock TODAY so SSR HTML matches the first client
   * render (no hydration mismatch), then lifted to the live date once on mount
   * in DashboardShell. Live providers query up to this date.
   */
  today: IsoDate;
  /**
   * The REAL NDVI acquisition date for the current view, derived from the
   * /api/map/layers payload. Sentinel-2 only revisits every ~5 days, so this
   * often differs from `selectedDate` (the nearest cloud-free pass, not the
   * requested day). The legend surfaces the gap so a stale-ish reading isn't
   * mistaken for today's data. Null until the fetch resolves or when no field
   * has NDVI (mock without raster).
   */
  ndviAcquiredAt: IsoDate | null;

  setSelectedField: (id: string | null) => void;
  setSelectedDate: (date: IsoDate) => void;
  setLayer: (layer: MapLayer) => void;
  setSelectedSensor: (id: string | null) => void;
  setToday: (date: IsoDate) => void;
  setNdviAcquiredAt: (date: IsoDate | null) => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedFieldId: null,
  selectedDate: TODAY,
  layer: "none",
  selectedSensorId: null,
  today: TODAY,
  ndviAcquiredAt: null,

  setSelectedField: (id) => set({ selectedFieldId: id }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLayer: (l) => set({ layer: l }),
  setSelectedSensor: (id) => set({ selectedSensorId: id }),
  setToday: (date) => set({ today: date }),
  setNdviAcquiredAt: (date) => set({ ndviAcquiredAt: date }),
}));
