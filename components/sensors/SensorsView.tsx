"use client";

import { useEffect, useState } from "react";
import { Plus, Broadcast } from "@phosphor-icons/react";
import { sensors as seedSensors } from "@/lib/mock/data";
import { useSensorsStore, useSensorsHydrated } from "@/lib/sensors-store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/icon";
import { SensorCard } from "@/components/sensors/SensorCard";
import { SensorEditorModal } from "@/components/sensors/SensorEditorModal";
import type { Sensor } from "@/lib/types";

/**
 * Combined sensors page body: merges the old soil-sensor cards with the
 * sensor-settings device table into one grid of editable sensor cards. The
 * store is persisted to localStorage, which is unavailable during SSR, so the
 * seed list renders on first paint and swaps to the persisted list once
 * `hydrated` flips true on the client (avoids a hydration mismatch).
 */
export function SensorsView() {
  const rehydrate = useSensorsStore((s) => s.rehydrate);
  const hydrated = useSensorsHydrated();
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  const storeSensors = useSensorsStore((s) => s.sensors);
  const sensors = hydrated ? storeSensors : seedSensors;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sensor | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(sensor: Sensor) {
    setEditing(sensor);
    setModalOpen(true);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Czujniki
          </h2>
          <p className="text-sm text-ink-muted">
            Odczyty glebowe, status i bateria wszystkich urządzeń.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Icon icon={Plus} size={16} />
          Nowy czujnik
        </Button>
      </header>

      {sensors.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sensors.map((sensor) => (
            <SensorCard key={sensor.id} sensor={sensor} onEdit={openEdit} />
          ))}
        </div>
      )}

      <SensorEditorModal
        open={modalOpen}
        sensor={editing}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon icon={Broadcast} size={24} />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-ink">Brak czujników</h3>
        <p className="max-w-sm text-sm text-ink-muted">
          Dodaj pierwszy czujnik, podając jego dane i pole.
        </p>
      </div>
      <Button variant="primary" onClick={onCreate}>
        <Icon icon={Plus} size={16} />
        Nowy czujnik
      </Button>
    </Card>
  );
}
