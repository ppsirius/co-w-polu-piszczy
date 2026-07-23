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

  setSelectedField: (id: string | null) => void;
  setSelectedDate: (date: IsoDate) => void;
  setLayer: (layer: MapLayer) => void;
  setSelectedSensor: (id: string | null) => void;
};

export const useUIStore = create<UIState>((set) => ({
  selectedFieldId: null,
  selectedDate: TODAY,
  layer: "none",
  selectedSensorId: null,

  setSelectedField: (id) => set({ selectedFieldId: id }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLayer: (l) => set({ layer: l }),
  setSelectedSensor: (id) => set({ selectedSensorId: id }),
}));
