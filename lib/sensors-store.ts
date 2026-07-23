"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Sensor } from "@/lib/types";
import { sensors as seedSensors } from "@/lib/mock/data";

/**
 * Editable sensors store (sensors feature).
 *
 * Mirrors lib/fields-store.ts: the mock dataset (lib/mock/data.ts) is the
 * immutable seed. First load and any state without persisted data start from
 * it. User edits (add / edit / delete) mutate this store and are mirrored to
 * localStorage so they survive a refresh. The map device panel and the deep
 * inspection page still import the static seed directly; only the /sensors page
 * reads here, matching the agreed scope (same split as field-management).
 *
 * Zustand `persist` is wired with `skipHydration` + an explicit `rehydrate()`
 * call from a client-only hook. On the server there is no localStorage, so a
 * naive persist middleware would serialize the seed to `[]` during SSR and
 * cause a hydration mismatch. Driving rehydration from the client avoids that.
 */
type SensorsState = {
  sensors: Sensor[];
  /** False until the persisted state has been read on the client. */
  hydrated: boolean;

  addSensor: (sensor: Sensor) => void;
  updateSensor: (id: string, patch: Partial<Sensor>) => void;
  deleteSensor: (id: string) => void;
  rehydrate: () => void;
};

export const useSensorsStore = create<SensorsState>()(
  persist(
    (set) => ({
      sensors: seedSensors,
      hydrated: false,

      addSensor: (sensor) =>
        set((s) => ({ sensors: [...s.sensors, sensor] })),

      updateSensor: (id, patch) =>
        set((s) => ({
          sensors: s.sensors.map((sensor) =>
            sensor.id === id ? { ...sensor, ...patch } : sensor,
          ),
        })),

      deleteSensor: (id) =>
        set((s) => ({ sensors: s.sensors.filter((sensor) => sensor.id !== id) })),

      rehydrate: () => set({ hydrated: true }),
    }),
    {
      name: "cowpolupiszczy-sensors",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient flags; keep only the data.
      partialize: (s) => ({ sensors: s.sensors }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

/** Read-only selector hook (stable, minimal subscriptions). */
export const useSensors = (): Sensor[] => useSensorsStore((s) => s.sensors);

/** Whether the persisted state has been loaded on the client. */
export const useSensorsHydrated = (): boolean =>
  useSensorsStore((s) => s.hydrated);
