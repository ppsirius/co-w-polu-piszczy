import { FieldGrid } from "@/components/fields/FieldGrid";
import { fields } from "@/lib/mock/data";

export default function PanelGlownyPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Panel główny
        </h2>
        <p className="text-sm text-ink-muted">
          Przegląd stanu {fields.length} pól. Kliknij pole, aby zobaczyć szczegóły na mapie.
        </p>
      </header>
      <FieldGrid fields={fields} />
    </div>
  );
}
