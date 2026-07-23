"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapTrifold, PencilSimple, Plus, SquaresFour } from "@phosphor-icons/react";
import { fields as seedFields } from "@/lib/mock/data";
import { cropLabel } from "@/lib/labels";
import { useFieldsStore, useFieldsHydrated } from "@/lib/fields-store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/StatusPill";
import { FieldEditorModal } from "@/components/fields/FieldEditorModal";
import type { Field } from "@/lib/types";

/**
 * Field management. Lists editable fields from the persisted store and opens a
 * modal to add a new field or edit an existing one (including redrawing the
 * polygon shape). The dashboard home / crop-rotation / AI pages keep reading
 * the static mock directly; only this page and the map read the store.
 *
 * Hydration: the store is persisted to localStorage, which is unavailable
 * during SSR. We render the seed list on first paint and swap to the persisted
 * list once `hydrated` flips true on the client, avoiding a mismatch.
 */
export default function FieldManagementPage() {
  // Trigger client-only rehydration of the persisted store.
  const rehydrate = useFieldsStore((s) => s.rehydrate);
  const hydrated = useFieldsHydrated();
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  // Until hydrated, show the seed list so SSR and first client paint match.
  const storeFields = useFieldsStore((s) => s.fields);
  const fields = hydrated ? storeFields : seedFields;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Field | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(field: Field) {
    setEditing(field);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Zarządzanie polami
          </h2>
          <p className="text-sm text-ink-muted">
            Lista pól z możliwością edycji uprawy i podglądu na mapie.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Icon icon={Plus} size={16} />
          Nowe pole
        </Button>
      </header>

      {fields.length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <Card key={field.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">
                  {field.name}
                </h3>
                <StatusPill status={field.status} />
              </div>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-ink-muted">Uprawa</dt>
                <dd className="text-ink">
                  {cropLabel[field.crop.crop]}
                </dd>
                <dt className="text-ink-muted">Siew</dt>
                <dd className="font-mono text-ink">
                  {field.crop.sowingDate}
                </dd>
                <dt className="text-ink-muted">Powierzchnia</dt>
                <dd className="font-mono text-xs text-ink-subtle">
                  {field.areaHa.toFixed(2)} ha
                </dd>
                <dt className="text-ink-muted">Centroid</dt>
                <dd className="font-mono text-xs text-ink-subtle">
                  {field.centroid[0].toFixed(3)}, {field.centroid[1].toFixed(3)}
                </dd>
              </dl>
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <Link
                  href={`/map?field=${field.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
                >
                  <Icon icon={MapTrifold} size={16} />
                  Mapa
                </Link>
                <Button
                  variant="secondary"
                  className="ml-auto"
                  onClick={() => openEdit(field)}
                >
                  <Icon icon={PencilSimple} size={16} />
                  Edytuj
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FieldEditorModal
        open={modalOpen}
        field={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon icon={SquaresFour} size={24} />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-ink">Brak pól</h3>
        <p className="max-w-sm text-sm text-ink-muted">
          Dodaj pierwsze pole, rysując jego kształt na mapie.
        </p>
      </div>
      <Button variant="primary" onClick={onCreate}>
        <Icon icon={Plus} size={16} />
        Nowe pole
      </Button>
    </Card>
  );
}
