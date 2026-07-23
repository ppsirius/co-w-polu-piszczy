"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

type Option = { value: string; label: string };

/**
 * Labeled native <select>. Uses the same surface styling as TextInput so form
 * controls line up. `options` may be a record enum->label (via Object.entries)
 * or an explicit {value,label}[] for fine-grained control.
 */
export function SelectInput({
  label,
  options,
  className,
  ...props
}: React.ComponentProps<"select"> & {
  label: string;
  options: Option[];
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-ink-muted"
      >
        {label}
      </label>
      <select
        id={id}
        className={cn(
          "rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink focus:border-primary",
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Build SelectInput options from a `Record<enum, label>` like `cropLabel`. */
export function optionsFromRecord(
  record: Record<string, string>,
): Option[] {
  return Object.entries(record).map(([value, label]) => ({ value, label }));
}
