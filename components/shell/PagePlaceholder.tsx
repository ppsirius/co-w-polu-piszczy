"use client";

import { Icon } from "@/components/ui/icon";
import { Hammer } from "@phosphor-icons/react";

/**
 * Section-under-construction placeholder. Uses an empty-state pattern
 * (DESIGN.sh): icon, heading, supporting copy - no spinners.
 */
export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-canvas p-8 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
          <Icon icon={Hammer} size={24} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm text-ink-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
