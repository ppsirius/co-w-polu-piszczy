"use client";

import Link from "next/link";
import { MapTrifold, PencilSimple } from "@phosphor-icons/react";
import { fields } from "@/lib/mock/data";
import { cropLabel } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icon";

export default function FieldManagementPage() {
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
        <Button variant="primary" className="hidden sm:inline-flex">
          <Icon icon={PencilSimple} size={16} />
          Nowe pole
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Card key={field.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">{field.name}</h3>
              <span className="font-mono text-xs text-ink-subtle">
                {field.areaHa.toFixed(1)} ha
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-muted">Uprawa</dt>
              <dd className="text-ink">{cropLabel[field.crop.crop]}</dd>
              <dt className="text-ink-muted">Siew</dt>
              <dd className="font-mono text-ink">{field.crop.sowingDate}</dd>
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
              <Button variant="secondary" className="ml-auto">
                <Icon icon={PencilSimple} size={16} />
                Edytuj
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
