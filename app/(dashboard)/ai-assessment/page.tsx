"use client";

import { Sparkle } from "@phosphor-icons/react";
import { fields } from "@/lib/mock/data";
import { ndviSamples, sensorReadings, getSensorsForField } from "@/lib/mock/data";
import { cropLabel } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Icon } from "@/components/ui/icon";
import type { FieldStatus } from "@/lib/types";

export default function AiAssessmentPage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
          <Icon icon={Sparkle} size={20} className="text-primary" />
          Ocena pól AI
        </h2>
        <p className="text-sm text-ink-muted">
          Zautomatyzowana ocena stanu upraw i rekomendacje zabiegów, wyprowadzona z NDVI i odczytów glebowych.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map((field) => {
          const latestNdvi = [...ndviSamples]
            .filter((s) => s.fieldId === field.id)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
          const ground = getSensorsForField(field.id).find((s) => s.kind === "glebowy");
          const latestSoil = ground
            ? [...sensorReadings]
                .filter((r) => r.sensorId === ground.id)
                .sort((a, b) => b.date.localeCompare(a.date))[0]
            : undefined;
          const assessment = assess(
            latestNdvi?.value ?? null,
            latestSoil?.soilMoisturePct ?? null,
            field.crop.crop,
          );
          return (
            <Card key={field.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-base font-semibold text-ink">{field.name}</h3>
                  <p className="text-xs text-ink-muted">{cropLabel[field.crop.crop]}</p>
                </div>
                <StatusPill status={assessment.status} />
              </div>
              <div className="flex flex-wrap gap-4 rounded-md bg-surface-1 p-3 font-mono text-sm">
                <Stat label="NDVI" value={latestNdvi ? latestNdvi.value.toFixed(2) : "-"} />
                <Stat
                  label="Wilgotność"
                  value={latestSoil ? `${latestSoil.soilMoisturePct}%` : "-"}
                />
              </div>
              <p className="text-sm text-ink-muted">{assessment.recommendation}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </span>
  );
}

/** Lightweight rule-based assessment standing in for an ML model. */
function assess(
  ndvi: number | null,
  moisture: number | null,
  crop: string,
): { status: FieldStatus; recommendation: string } {
  if (ndvi !== null && ndvi < 0.4) {
    return {
      status: "urgent",
      recommendation:
        "Niski NDVI sugeruje stres lub opóźnienie rozwoju. Zweryfikuj w terenie zasoby wodne i ewentualne uszkodzenia.",
    };
  }
  if (moisture !== null && moisture < 25) {
    return {
      status: "warning",
      recommendation:
        "Wilgotność gleby poniżej progu stresu hydro. Rozważ nawadnianie, jeśli brak opadów w prognozie.",
    };
  }
  if (ndvi !== null && ndvi > 0.7) {
    return {
      status: "normal",
      recommendation:
        "Biomasa w dobrej kondycji. Monitoruj ryzyko chorób grzybowych przy wysokiej wilgotności i długotrwałej rosole.",
    };
  }
  if (crop === "rzepak") {
    return {
      status: "follow-up",
      recommendation:
        "Rzepak wchodzi w fazę dojrzewania. Zaplanuj termin zbioru i sprawdź wilgotność nasion.",
    };
  }
  return {
    status: "info",
    recommendation: "Brak sygnałów alarmowych. Utrzymuj regularny monitoring NDVI i wilgotności.",
  };
}
