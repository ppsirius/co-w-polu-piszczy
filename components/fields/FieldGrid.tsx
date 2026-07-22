import { FieldCard } from "@/components/fields/FieldCard";
import type { Field } from "@/lib/types";

/** Responsive grid of field cards. */
export function FieldGrid({ fields }: { fields: Field[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <FieldCard key={field.id} field={field} />
      ))}
    </div>
  );
}
