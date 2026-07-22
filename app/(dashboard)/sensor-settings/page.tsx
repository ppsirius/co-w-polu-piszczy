import { sensors, getField } from "@/lib/mock/data";
import { sensorKindLabel } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { SensorStatus } from "@/lib/types";

const STATUS_CELL: Record<SensorStatus, { dot: string; text: string }> = {
  online: { dot: "bg-normal", text: "text-ink" },
  warning: { dot: "bg-warning", text: "text-warning" },
  offline: { dot: "bg-urgent", text: "text-urgent" },
};

export default function SensorSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Ustawienia czujników
        </h2>
        <p className="text-sm text-ink-muted">
          Wszystkie urządzenia: status, poziom baterii, ostatni odczyt i przypisane pole.
        </p>
      </header>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1 text-left text-xs font-medium tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3">Urządzenie</th>
              <th scope="col" className="px-4 py-3">Typ</th>
              <th scope="col" className="px-4 py-3">Pole</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-right">Bateria</th>
              <th scope="col" className="px-4 py-3 text-right">Ostatni odczyt</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((sensor) => {
              const field = getField(sensor.fieldId);
              const cell = STATUS_CELL[sensor.status];
              return (
                <tr
                  key={sensor.id}
                  className="border-b border-border last:border-0 hover:bg-surface-1"
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                    {sensor.name}
                  </th>
                  <td className="px-4 py-3 text-ink-muted">
                    {sensorKindLabel[sensor.kind]}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{field?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 capitalize", cell.text)}>
                      <span className={cn("h-2 w-2 rounded-full", cell.dot)} aria-hidden />
                      {sensor.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink-muted">
                    {sensor.batteryPct}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink-subtle">
                    {sensor.lastSeenAt}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
