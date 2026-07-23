import { FieldGrid } from "@/components/fields/FieldGrid";
import { fields, TODAY } from "@/lib/mock/data";
import { getFieldMetrics } from "@/lib/metrics";
import type { FieldMetrics } from "@/lib/types";

/**
 * Dashboard home.
 *
 * Metrics are precomputed on the server (not fetched per-card on the client)
 * so each card renders loaded on first paint - no skeleton flash for mock data
 * the page already has. We resolve at the frozen mock TODAY (not the live
 * clock) so the build is deterministic; the cards' effect reconciles to the
 * real today once the dashboard shell lifts it after hydration.
 */
export default async function PanelGlownyPage() {
  const metricsEntries = await Promise.all(
    fields.map(async (field) => {
      const metrics = await getFieldMetrics(field.id, TODAY);
      return [field.id, metrics] as const;
    }),
  );
  const metricsByField = Object.fromEntries(metricsEntries) as Record<
    string,
    FieldMetrics | null
  >;

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
      <FieldGrid fields={fields} metricsByField={metricsByField} />
    </div>
  );
}
