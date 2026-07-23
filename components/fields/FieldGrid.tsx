import { FieldCard } from "@/components/fields/FieldCard";
import type { Field, FieldMetrics } from "@/lib/types";

/** Responsive grid of field cards. */
export function FieldGrid({
  fields,
  /** Optional server-precomputed metrics keyed by field id (no first-paint skeleton). */
  metricsByField,
}: {
  fields: Field[];
  metricsByField?: Record<string, FieldMetrics | null>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((field, i) => (
        <FieldCard
          key={field.id}
          field={field}
          // priority preloads the LCP image for the first card above the fold.
          priority={i === 0}
          initialMetrics={metricsByField?.[field.id]}
        />
      ))}
    </div>
  );
}
