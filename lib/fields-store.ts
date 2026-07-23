"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Field } from "@/lib/types";
import { fields as seedFields } from "@/lib/mock/data";
import { polygonAreaHa, polygonCentroid } from "@/lib/geometry";

/**
 * Editable fields store (field-management feature).
 *
 * The mock dataset (lib/mock/data.ts) is the immutable seed: first load and
 * any state without persisted data start from it. User edits (add / edit /
 * delete / redraw shape) mutate this store and are mirrored to localStorage so
 * they survive a refresh. The dashboard home / crop-rotation / AI pages keep
 * importing the static seed directly; only field-management and the map read
 * here, per the agreed scope.
 *
 * Zustand `persist` is wired with `skipHydration` + an explicit `rehydrate()`
 * call from a client-only hook. On the server there is no localStorage, so a
 * naive persist middleware would serialize the seed to `[]` during SSR and
 * cause a hydration mismatch. Driving rehydration from the client avoids that.
 */
type FieldsState = {
  fields: Field[];
  /** False until the persisted state has been read on the client. */
  hydrated: boolean;

  addField: (field: Field) => void;
  updateField: (id: string, patch: Partial<Field>) => void;
  deleteField: (id: string) => void;
  rehydrate: () => void;
};

export const useFieldsStore = create<FieldsState>()(
  persist(
    (set) => ({
      fields: seedFields,
      hydrated: false,

      addField: (field) =>
        set((s) => ({ fields: [...s.fields, field] })),

      updateField: (id, patch) =>
        set((s) => ({
          fields: s.fields.map((f) => {
            if (f.id !== id) return f;
            const next = { ...f, ...patch };
            // If the polygon changed, recompute the derived geometry so area +
            // centroid always reflect the shape (the mock hardcodes them; an
            // edited/drawn polygon must not keep stale derived values).
            if (patch.polygon) {
              const ring = patch.polygon.coordinates[0];
              next.areaHa = polygonAreaHa(ring);
              next.centroid = polygonCentroid(ring);
            }
            return next;
          }),
        })),

      deleteField: (id) =>
        set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),

      rehydrate: () => set({ hydrated: true }),
    }),
    {
      name: "cowpolupiszczy-fields",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient flags; keep only the data.
      partialize: (s) => ({ fields: s.fields }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

/** Read-only selector hook (stable, minimal subscriptions). */
export const useFields = (): Field[] => useFieldsStore((s) => s.fields);

/** Whether the persisted state has been loaded on the client. */
export const useFieldsHydrated = (): boolean =>
  useFieldsStore((s) => s.hydrated);
