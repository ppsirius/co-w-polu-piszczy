"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import type { IsoDate } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Timeline slider (brief §2.D) - the diagnostic image scrubber.
 *
 * Performance strategy (answers the brief's question about fast scrubbing
 * without frame drops):
 *   - The slider thumb position lives in a Motion `useMotionValue`, NOT React
 *     state. Dragging therefore updates a single DOM transform directly and
 *     never triggers re-renders mid-drag (anti-slop rule: never useState for
 *     continuous input).
 *   - The committed date is debounced: only when the pointer is released do we
 *     call `onSelect(date)`, so a month-long scrub fires one query, not 300.
 *   - The thumb is moved via `transform: translateX()` only (GPU-friendly).
 *
 * The component is date-based: callers pass the discrete list of available
 * capture dates; the thumb snaps to the nearest one.
 */
export function TimelineSlider({
  dates,
  selectedDate,
  onSelect,
  className,
}: {
  /** All available capture dates, ascending. */
  dates: IsoDate[];
  selectedDate: IsoDate;
  /** Called once with the snapped date after a drag/keypress. */
  onSelect: (date: IsoDate) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastIndex = Math.max(0, dates.length - 1);

  // Index of the current date within `dates`.
  const currentIndex = useMemo(() => {
    const i = dates.indexOf(selectedDate);
    return i === -1 ? lastIndex : i;
  }, [dates, selectedDate, lastIndex]);

  // Motion value in [0, 1] representing the thumb position along the track.
  const position = useMotionValue(currentIndex / lastIndex || 0);
  // Thumb translateX in px is derived from position * track width at render.
  const thumbLeft = useTransform(position, (p) => `${p * 100}%`);

  // Keep the motion value in sync when selectedDate changes externally.
  useEffect(() => {
    if (dates.length > 1) {
      position.set(currentIndex / lastIndex);
    } else {
      position.set(0);
    }
  }, [currentIndex, lastIndex, dates.length, position]);

  function commitFromFraction(fraction: number) {
    if (dates.length === 0) return;
    const clamped = Math.max(0, Math.min(1, fraction));
    const idx = Math.round(clamped * lastIndex);
    onSelect(dates[idx] ?? selectedDate);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSelect(dates[Math.max(0, currentIndex - 1)] ?? selectedDate);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onSelect(dates[Math.min(lastIndex, currentIndex + 1)] ?? selectedDate);
    }
  }

  function handlePointer(e: React.PointerEvent) {
    const track = trackRef.current;
    if (!track || dates.length === 0) return;
    const rect = track.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    commitFromFraction(fraction);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between font-mono text-xs text-ink-muted">
        <span>{dates[0]}</span>
        <span className="text-ink-subtle">
          {currentIndex + 1} / {dates.length}
        </span>
        <span>{dates[dates.length - 1]}</span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Oś czasu zdjęć"
        aria-valuemin={1}
        aria-valuemax={dates.length}
        aria-valuenow={currentIndex + 1}
        aria-valuetext={selectedDate}
        onKeyDown={handleKey}
        onPointerDown={handlePointer}
        className="relative flex h-9 cursor-pointer touch-none select-none items-center"
      >
        {/* Track */}
        <div className="relative h-1.5 w-full rounded-full bg-surface-2">
          {/* Filled portion */}
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-primary"
            style={{ width: thumbLeft }}
          />
        </div>
        {/* Thumb */}
        <motion.div
          className="absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-primary bg-canvas shadow-elevated"
          style={{ left: thumbLeft, x: "-50%" }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      </div>

      {/* Tick marks: one per capture date */}
      <div className="relative flex h-3 w-full">
        {dates.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Przejdź do ${dates[i]}`}
            onClick={() => onSelect(dates[i])}
            className={cn(
              "absolute top-0 h-full w-px -translate-x-1/2 cursor-pointer transition-colors",
              i === currentIndex ? "bg-primary" : "bg-border-strong hover:bg-ink-subtle",
            )}
            style={{ left: `${(i / lastIndex) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
