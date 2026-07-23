"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";

/**
 * Full-viewport modal overlay (DESIGN.sh §4). No portal is used: the overlay
 * is `fixed inset-0` with a high z-index, rendered where it's mounted, which
 * keeps it within the React tree and avoids portal/DOM-order pitfalls.
 *
 * Behavior:
 * - Backdrop click closes (the panel stops propagation).
 * - Escape closes.
 * - Body scroll is locked while open.
 * - Enter/exit via `motion/react` fade + scale, honoring prefers-reduced-motion
 *   through the global CSS rule in globals.css.
 *
 * `size` controls max width; the panel is otherwise capped near full width on
 * small screens. An optional `footer` slot holds actions.
 */
type Size = "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: Size;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // Escape to close + body scroll lock while mounted.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            className={cn(
              "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-canvas shadow-overlay",
              SIZES[size],
              className,
            )}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {description && (
                  <p className="text-sm text-ink-muted">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zamknij"
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <Icon icon={X} size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">{children}</div>

            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-1 px-5 py-3">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
