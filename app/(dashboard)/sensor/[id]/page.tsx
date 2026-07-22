import { notFound } from "next/navigation";
import { getSensor, getField } from "@/lib/mock/data";
import { sensorKindLabel, sensorStatusLabel, cropLabel } from "@/lib/labels";
import { StatusPill } from "@/components/ui/StatusPill";
import { ImageBrowser } from "@/components/sensor/ImageBrowser";
import { NotesPanel } from "@/components/sensor/NotesPanel";

export default async function SensorInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sensor = getSensor(id);
  if (!sensor) notFound();
  const field = getField(sensor.fieldId);

  return (
    <div className="flex h-full flex-col">
      {/* Sensor header */}
      <header className="flex flex-col gap-2 border-b border-border bg-canvas px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              {sensor.name}
            </h1>
            <p className="text-sm text-ink-muted">
              {sensorKindLabel[sensor.kind]}
              {field ? ` · ${field.name} · ${cropLabel[field.crop.crop]}` : ""}
            </p>
          </div>
          <StatusPill
            status={
              sensor.status === "online"
                ? "normal"
                : sensor.status === "warning"
                  ? "warning"
                  : "urgent"
            }
            label={sensorStatusLabel[sensor.status]}
          />
        </div>
      </header>

      {/* Body: image browser + notes */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <ImageBrowser sensorId={sensor.id} />
        </div>
        <NotesPanel sensorId={sensor.id} />
      </div>
    </div>
  );
}
