"use client";

import { BellSimple, UserCircle } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/icon";

/**
 * Fixed 56px top bar. Holds the global date selector in T6; for now it shows
 * the page context and account actions (brief §5: clinical dashboard header).
 */
export function TopBar({ title }: { title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-canvas px-6">
      <h1 className="text-base font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Powiadomienia"
        >
          <Icon icon={BellSimple} size={20} />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Konto"
        >
          <Icon icon={UserCircle} size={20} />
        </button>
      </div>
    </header>
  );
}
