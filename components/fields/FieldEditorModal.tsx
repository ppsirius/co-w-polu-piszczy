"use client";

import { useMemo, useState } from "react";
import { Trash, PencilSimple, Check } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icon";
import { TextInput } from "@/components/ui/TextInput";
import {
  SelectInput,
  optionsFromRecord,
} from "@/components/ui/SelectInput";
import { FieldDrawMap } from "@/components/fields/FieldDrawMap";
import { useFieldsStore } from "@/lib/fields-store";
import { cropLabel, fieldStatusLabel } from "@/lib/labels";
import { polygonAreaHa, polygonCentroid, uniqueVertexCount } from "@/lib/geometry";
import type { CropType, Field, FieldPolygon, FieldStatus } from "@/lib/types";

const CROP_OPTIONS = optionsFromRecord(cropLabel);
const STATUS_OPTIONS = optionsFromRecord(fieldStatusLabel);

/** Base temperatures (°C) for GDD, keyed by crop - mirrors the mock dataset. */
const BASE_TEMP_BY_CROP: Record<CropType, number> = {
  pszenica_ozima: 0,
  rzepak: 5,
  kukurydza: 10,
  jeczmien: 0,
  burak_cukrowy: 5,
};

/**
 * Modal shell that stays mounted (so enter/exit animate) while the form body
 * remounts per target via `key`. This avoids syncing props into state through
 * an effect: each open / field change creates a fresh FieldForm whose useState
 * initializes straight from the field.
 */
export function FieldEditorModal({
  open,
  field,
  onClose,
}: {
  open: boolean;
  /** When null, the modal is in create mode; otherwise it edits this field. */
  field: Field | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={field ? `Edytuj: ${field.name}` : "Nowe pole"}
      description={
        field
          ? "Zmień kształt pola lub dane uprawy."
          : "Narysuj kształt pola na mapie i uzupełnij uprawę."
      }
    >
      {/* key remounts the form (and its state) when the target changes. */}
      <FieldForm key={field?.id ?? "create"} field={field} onClose={onClose} />
    </Modal>
  );
}

function FieldForm({
  field,
  onClose,
}: {
  field: Field | null;
  onClose: () => void;
}) {
  const mode: Mode = field ? "edit" : "create";
  const addField = useFieldsStore((s) => s.addField);
  const updateField = useFieldsStore((s) => s.updateField);
  const deleteField = useFieldsStore((s) => s.deleteField);

  const [name, setName] = useState(field?.name ?? "");
  const [description, setDescription] = useState(field?.description ?? "");
  const [crop, setCrop] = useState<CropType>(field?.crop.crop ?? "pszenica_ozima");
  const [sowingDate, setSowingDate] = useState(field?.crop.sowingDate ?? "");
  const [harvestDate, setHarvestDate] = useState(
    field?.crop.expectedHarvestDate ?? "",
  );
  const [status, setStatus] = useState<FieldStatus>(field?.status ?? "normal");
  const [polygon, setPolygon] = useState<FieldPolygon | null>(
    field?.polygon ?? null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const area = useMemo(
    () => (polygon ? polygonAreaHa(polygon.coordinates[0]) : 0),
    [polygon],
  );

  const validVertices =
    !!polygon && uniqueVertexCount(polygon.coordinates[0]) >= 3;
  const canSave = name.trim().length > 0 && validVertices;

  function handleSave() {
    if (!canSave || !polygon) return;
    const trimmed = name.trim();
    const ring = polygon.coordinates[0];
    if (mode === "create") {
      addField({
        id: `f-local-${Date.now()}`,
        name: trimmed,
        description: description.trim() || undefined,
        crop: {
          crop,
          sowingDate: sowingDate || todayIso(),
          expectedHarvestDate: harvestDate || todayIso(),
          baseTempC: BASE_TEMP_BY_CROP[crop],
        },
        areaHa: polygonAreaHa(ring),
        polygon,
        centroid: polygonCentroid(ring),
        status,
      } satisfies Field);
    } else if (field) {
      updateField(field.id, {
        name: trimmed,
        description: description.trim() || undefined,
        status,
        crop: {
          crop,
          sowingDate: sowingDate || field.crop.sowingDate,
          expectedHarvestDate: harvestDate || field.crop.expectedHarvestDate,
          baseTempC: BASE_TEMP_BY_CROP[crop],
        },
        polygon,
      });
    }
    onClose();
  }

  function handleDelete() {
    if (!field) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteField(field.id);
    onClose();
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_320px]">
        {/* Map / drawing canvas */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-1 px-5 py-2.5">
            <span className="text-xs font-medium tracking-wide text-ink-muted">
              Kształt pola
            </span>
            <span className="font-mono text-xs text-ink-subtle">
              {area > 0
                ? `${area.toFixed(2)} ha`
                : "narysuj polygon"}
              {validVertices &&
                ` · ${uniqueVertexCount(polygon!.coordinates[0])} wierzchołków`}
            </span>
          </div>
          <div className="h-[360px] w-full md:h-[460px]">
            <FieldDrawMap
              initialPolygon={mode === "edit" ? field?.polygon ?? null : null}
              locateUser={mode === "create"}
              onChange={setPolygon}
            />
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 border-t border-border p-5 md:border-l md:border-t-0">
          <TextInput
            label="Nazwa pola"
            value={name}
            placeholder="np. Łąki Rawickie"
            onChange={(e) => setName(e.target.value)}
          />
          {/* Description is shown as a caption under the field photo on the
              dashboard card. Optional; textarea matches the input styling. */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="field-description"
              className="text-xs font-medium tracking-wide text-ink-muted"
            >
              Opis
            </label>
            <textarea
              id="field-description"
              value={description}
              placeholder="Krótka notatka widoczna na karcie pola"
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-y rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-primary"
            />
          </div>
          <SelectInput
            label="Uprawa"
            value={crop}
            options={CROP_OPTIONS}
            onChange={(e) => setCrop(e.target.value as CropType)}
          />
          <TextInput
            label="Data siewu"
            type="date"
            value={sowingDate}
            onChange={(e) => setSowingDate(e.target.value)}
          />
          <TextInput
            label="Przewidywany zbiór"
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
          />
          <SelectInput
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => setStatus(e.target.value as FieldStatus)}
          />
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-1 px-5 py-3">
        {mode === "edit" && (
          <Button
            variant="ghost"
            className="mr-auto text-urgent hover:bg-urgent-bg"
            onClick={handleDelete}
          >
            <Icon icon={Trash} size={16} />
            {confirmDelete ? "Kliknij ponownie, aby usunąć" : "Usuń pole"}
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Anuluj
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          <Icon icon={mode === "create" ? PencilSimple : Check} size={16} />
          {mode === "create" ? "Dodaj pole" : "Zapisz zmiany"}
        </Button>
      </footer>
    </>
  );
}

type Mode = "create" | "edit";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
