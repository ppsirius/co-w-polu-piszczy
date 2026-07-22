"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  sensorProvider,
} from "@/lib/providers/registry";
import { TimelineSlider } from "@/components/sensor/TimelineSlider";
import { channelLabel } from "@/lib/labels";
import type { ImageChannel, IsoDate, SensorImage } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";
import { Camera, Eye } from "@phosphor-icons/react";

const CHANNELS: ImageChannel[] = ["rgb", "ir", "ndvi"];

/**
 * Image browser + timeline (brief §2.D). Renders the selected day's capture
 * for the active channel, with a channel toggle and the timeline slider below.
 *
 * Loading optimization: when the selected date changes, the neighboring days'
 * images are prefetched via a hidden <link rel="prefetch"> so a subsequent
 * nudge loads instantly. The images themselves are also cached by next/image.
 */
export function ImageBrowser({ sensorId }: { sensorId: string }) {
  const [images, setImages] = useState<SensorImage[] | undefined>();
  const [channel, setChannel] = useState<ImageChannel>("rgb");
  const [selectedDate, setSelectedDate] = useState<IsoDate | null>(null);

  // Load all images for the sensor (across all channels/dates).
  useEffect(() => {
    let active = true;
    sensorProvider.getImages(sensorId).then((imgs) => {
      if (!active) return;
      // Deduplicate dates: a capture exists for each channel on each date.
      const dates = [...new Set(imgs.map((i) => i.date))].sort((a, b) =>
        a.localeCompare(b),
      );
      setImages(imgs);
      setSelectedDate((prev) => prev ?? dates[dates.length - 1] ?? null);
    });
    return () => {
      active = false;
    };
  }, [sensorId]);

  const dates = useMemo(() => {
    if (!images) return [];
    return [...new Set(images.map((i) => i.date))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [images]);

  const currentImage = useMemo(() => {
    if (!images || !selectedDate) return undefined;
    return images.find(
      (img) => img.date === selectedDate && img.channel === channel,
    );
  }, [images, selectedDate, channel]);

  // Prefetch the neighboring dates' images (±1) for the current channel.
  const neighbors = useMemo(() => {
    if (!dates.length || !selectedDate) return [];
    const idx = dates.indexOf(selectedDate);
    const out: SensorImage[] = [];
    if (!images) return out;
    for (const offset of [-1, 1]) {
      const d = dates[idx + offset];
      if (!d) continue;
      const img = images.find((i) => i.date === d && i.channel === channel);
      if (img) out.push(img);
    }
    return out;
  }, [dates, selectedDate, images, channel]);

  if (images === undefined) {
    return <ImageBrowserSkeleton />;
  }

  if (images.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-canvas p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-subtle">
          <Icon icon={Camera} size={24} />
        </span>
        <p className="text-sm text-ink-muted">
          Brak zdjęć dla tego czujnika.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Channel toggle */}
      <div
        role="radiogroup"
        aria-label="Kanał obrazu"
        className="flex items-center gap-1 self-start rounded-md border border-border bg-canvas p-1"
      >
        {CHANNELS.map((ch) => {
          const selected = channel === ch;
          return (
            <button
              key={ch}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setChannel(ch)}
              className={cn(
                "min-h-8 rounded-sm px-3 text-xs font-medium transition-colors",
                selected
                  ? "bg-primary text-on-primary"
                  : "text-ink-muted hover:bg-primary-light hover:text-primary",
              )}
            >
              {channelLabel[ch]}
            </button>
          );
        })}
      </div>

      {/* Main image */}
      <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-ink">
        {currentImage ? (
          <Image
            key={currentImage.id}
            src={currentImage.url}
            alt={`Zdjęcie ${channelLabel[channel]} z ${selectedDate}`}
            fill
            sizes="(max-width: 1024px) 100vw, 700px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-canvas/70">
              Brak kanału {channelLabel[channel]} dla {selectedDate}.
            </p>
          </div>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-ink/70 px-2.5 py-1 font-mono text-xs text-canvas backdrop-blur-sm">
          <Icon icon={Eye} size={12} />
          {selectedDate} · {channelLabel[channel]}
        </span>
      </div>

      {/* Hidden prefetch hints for neighbors */}
      {neighbors.map((img) => (
        <link key={img.id} rel="prefetch" as="image" href={img.url} />
      ))}

      {/* Timeline slider */}
      <TimelineSlider
        dates={dates}
        selectedDate={selectedDate ?? dates[dates.length - 1]}
        onSelect={setSelectedDate}
      />
    </div>
  );
}

function ImageBrowserSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col gap-4">
      <div className="h-10 w-48 rounded-md bg-surface-2" />
      <div className="flex-1 rounded-xl bg-surface-2" />
      <div className="h-9 w-full rounded-md bg-surface-2" />
    </div>
  );
}
