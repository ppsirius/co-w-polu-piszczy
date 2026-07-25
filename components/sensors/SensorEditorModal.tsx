"use client";

import { useState } from "react";
import { Trash, PencilSimple, Check } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icon";
import { TextInput } from "@/components/ui/TextInput";
import {
  SelectInput,
  optionsFromRecord,
} from "@/components/ui/SelectInput";
import { useSensorsStore } from "@/lib/sensors-store";
import { useFields } from "@/lib/fields-store";
import { sensorKindLabel, sensorStatusLabel } from "@/lib/labels";
import { clamp } from "@/lib/utils/number";
import { todayIso } from "@/lib/utils/today";
import type {
  Sensor,
  SensorKind,
  SensorStatus,
} from "@/lib/types";

const KIND_OPTIONS = optionsFromRecord(sensorKindLabel);
const STATUS_OPTIONS = optionsFromRecord(sensorStatusLabel);

/**
 * Add/edit sensor modal. Mirrors FieldEditorModal: the shell stays mounted so
 * enter/exit animate, while the form remounts per target via `key` (each open /
 * sensor change creates a fresh SensorForm whose useState initializes straight
 * from the sensor — no syncing props into state through an effect).
 */
export function SensorEditorModal({
  open,
  sensor,
  onClose,
}: {
  open: boolean;
  /** When null, the modal is in create mode; otherwise it edits this sensor. */
  sensor: Sensor | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={sensor ? `Edytuj: ${sensor.name}` : "Nowy czujnik"}
      description={
        sensor
          ? "Zmień dane czujnika i jego przypisanie do pola."
          : "Uzupełnij dane nowego czujnika."
      }
    >
      {/* key remounts the form (and its state) when the target changes. */}
      <SensorForm key={sensor?.id ?? "create"} sensor={sensor} onClose={onClose} />
    </Modal>
  );
}

function SensorForm({
  sensor,
  onClose,
}: {
  sensor: Sensor | null;
  onClose: () => void;
}) {
  const mode: Mode = sensor ? "edit" : "create";
  const addSensor = useSensorsStore((s) => s.addSensor);
  const updateSensor = useSensorsStore((s) => s.updateSensor);
  const deleteSensor = useSensorsStore((s) => s.deleteSensor);
  const fields = useFields();

  const [name, setName] = useState(sensor?.name ?? "");
  const [kind, setKind] = useState<SensorKind>(sensor?.kind ?? "glebowy");
  const [fieldId, setFieldId] = useState(sensor?.fieldId ?? fields[0]?.id ?? "");
  const [status, setStatus] = useState<SensorStatus>(sensor?.status ?? "online");
  const [batteryPct, setBatteryPct] = useState<string>(
    sensor ? String(sensor.batteryPct) : "100",
  );
  const [lastSeenAt, setLastSeenAt] = useState(sensor?.lastSeenAt ?? todayIso());
  const [lng, setLng] = useState<string>(
    sensor ? sensor.position.coordinates[0].toFixed(5) : "",
  );
  const [lat, setLat] = useState<string>(
    sensor ? sensor.position.coordinates[1].toFixed(5) : "",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fieldOptions = fields.map((f) => ({ value: f.id, label: f.name }));

  const canSave =
    name.trim().length > 0 &&
    fieldId.length > 0 &&
    lng !== "" &&
    lat !== "" &&
    !Number.isNaN(Number(lng)) &&
    !Number.isNaN(Number(lat));

  function handleSave() {
    if (!canSave) return;
    const trimmed = name.trim();
    const coordinates: [number, number] = [Number(lng), Number(lat)];
    if (mode === "create") {
      addSensor({
        id: `s-local-${Date.now()}`,
        name: trimmed,
        kind,
        fieldId,
        position: { type: "Point", coordinates },
        status,
        batteryPct: clampPct(batteryPct),
        lastSeenAt,
      } satisfies Sensor);
    } else if (sensor) {
      updateSensor(sensor.id, {
        name: trimmed,
        kind,
        fieldId,
        position: { type: "Point", coordinates },
        status,
        batteryPct: clampPct(batteryPct),
        lastSeenAt,
      });
    }
    onClose();
  }

  function handleDelete() {
    if (!sensor) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteSensor(sensor.id);
    onClose();
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextInput
            label="Nazwa"
            value={name}
            placeholder="np. Sonda glebowa D"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <SelectInput
          label="Typ"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(e) => setKind(e.target.value as SensorKind)}
        />
        <SelectInput
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value as SensorStatus)}
        />
        <div className="sm:col-span-2">
          <SelectInput
            label="Pole"
            value={fieldId}
            options={fieldOptions}
            onChange={(e) => setFieldId(e.target.value)}
          />
        </div>
        <TextInput
          label="Bateria (%)"
          type="number"
          min={0}
          max={100}
          value={batteryPct}
          onChange={(e) => setBatteryPct(e.target.value)}
        />
        <TextInput
          label="Ostatni odczyt"
          type="date"
          value={lastSeenAt}
          onChange={(e) => setLastSeenAt(e.target.value)}
        />
        <TextInput
          label="Długość geogr. (lng)"
          type="number"
          step={0.00001}
          value={lng}
          placeholder="np. 16.86200"
          onChange={(e) => setLng(e.target.value)}
        />
        <TextInput
          label="Szerokość geogr. (lat)"
          type="number"
          step={0.00001}
          value={lat}
          placeholder="np. 51.60100"
          onChange={(e) => setLat(e.target.value)}
        />
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-1 px-5 py-3">
        {mode === "edit" && (
          <Button
            variant="ghost"
            className="mr-auto text-urgent hover:bg-urgent-bg"
            onClick={handleDelete}
          >
            <Icon icon={Trash} size={16} />
            {confirmDelete ? "Kliknij ponownie, aby usunąć" : "Usuń czujnik"}
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Anuluj
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          <Icon icon={mode === "create" ? PencilSimple : Check} size={16} />
          {mode === "create" ? "Dodaj czujnik" : "Zapisz zmiany"}
        </Button>
      </footer>
    </>
  );
}

type Mode = "create" | "edit";

/** Clamp a percentage string to [0,100]; returns 100 on invalid input. */
function clampPct(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 100;
  return clamp(Math.round(n), 0, 100);
}
