"use client";

import { Calendar } from "@phosphor-icons/react";
import { useUIStore } from "@/lib/store";
import { Icon } from "@/components/ui/icon";
import { TODAY } from "@/lib/mock/data";

/**
 * Global date selector (brief §1, §2.B). Bound to the Zustand store so a
 * change here propagates to every data-driven component. Native date input
 * keeps it accessible and keyboard-friendly.
 */
export function DateSelector() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);

  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-canvas px-3 py-1.5 text-sm">
      <Icon icon={Calendar} size={16} className="text-ink-subtle" />
      <span className="sr-only">Wybierz datę</span>
      <input
        type="date"
        value={selectedDate}
        min="2026-05-01"
        max={TODAY}
        onChange={(e) => setSelectedDate(e.target.value)}
        className="bg-transparent font-mono text-sm text-ink outline-none"
      />
    </label>
  );
}
