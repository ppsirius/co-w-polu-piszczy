"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Labeled text/number/date input. Matches the inline styling already used in
 * NotesPanel / DateSelector so the form primitives read as one set. The label
 * is always visible (not sr-only) because field forms have many fields.
 */
export function TextInput({
  label,
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-ink-muted"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={cn(
          "rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-primary",
          className,
        )}
        {...props}
      />
    </div>
  );
}
