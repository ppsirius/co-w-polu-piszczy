"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Drop,
  Thermometer,
  Lightning,
  PencilSimple,
  CaretDown,
  MapPin,
  BatteryFull,
  BatteryWarning,
  BatteryLow,
} from "@phosphor-icons/react";
import { sensorProvider } from "@/lib/providers/registry";
import { getField } from "@/lib/mock/data";
import { sensorKindLabel } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { Sensor, SensorReading, SensorStatus } from "@/lib/types";

/**
 * One sensor card in the /sensors grid (combined soil-sensor + sensor-settings).
 * Renders for every kind with a shared structure so the grid reads as one set:
 *
 *   header (name + status pill) → subtitle (kind · field) → metric hero →
 *   footer (Edit + expand toggle) → expandable technical details panel.
 *
 * The metric hero adapts to the kind: ground probes show moisture / temp / EC
 * (brief §2.A + §2.C, "vital signs grid"); other kinds show battery + last
 * seen, using the same large-mono metric treatment so cards stay consistent.
 * The technical-details panel expands with a 300ms ease-decelerate (DESIGN §6,
 * "card expansion"), collapsing to an instant render under reduced motion.
 */
export function SensorCard({
  sensor,
  onEdit,
}: {
  sensor: Sensor;
  onEdit: (sensor: Sensor) => void;
}) {
  const field = getField(sensor.fieldId);
  const pill = statusPill(sensor.status);
  const reduce = useReducedMotion();
  const [readings, setReadings] = useState<SensorReading[] | undefined>();
  const [debugOpen, setDebugOpen] = useState(false);

  // Only ground probes have readings in the mock dataset; others stay undefined.
  useEffect(() => {
    if (sensor.kind !== "glebowy") return;
    let active = true;
    sensorProvider.getReadings(sensor.id).then((series) => {
      if (active) setReadings(series);
    });
    return () => {
      active = false;
    };
  }, [sensor.id, sensor.kind]);

  const isSoil = sensor.kind === "glebowy";
  const latest = readings ? [...readings].reverse()[0] : undefined;

  return (
    <Card className="flex flex-col gap-0 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold text-ink">{sensor.name}</h3>
          <p className="text-xs text-ink-muted">
            {sensorKindLabel[sensor.kind]}
            {field ? ` · ${field.name}` : " · brak pola"}
          </p>
        </div>
        <StatusPill status={pill.status} label={pill.label} />
      </div>

      {/* Metric hero */}
      <div className="mt-4 border-t border-border pt-4">
        {isSoil ? (
          latest === undefined ? (
            readings === undefined ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Brak odczytów.</p>
            )
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <MetricCell
                icon={Drop}
                label="Wilgotność"
                value={`${latest.soilMoisturePct}`}
                unit="%"
                tone={latest.soilMoisturePct < 25 ? "warning" : undefined}
              />
              <MetricCell
                icon={Thermometer}
                label="Temp. gleby"
                value={`${latest.soilTempC.toFixed(1)}`}
                unit="°C"
              />
              <MetricCell
                icon={Lightning}
                label="Przewodność"
                value={`${latest.ecDsM.toFixed(2)}`}
                unit="dS/m"
              />
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <MetricCell
              icon={batteryIcon(sensor.batteryPct)}
              label="Bateria"
              value={`${sensor.batteryPct}`}
              unit="%"
              tone={sensor.batteryPct < 15 ? "urgent" : sensor.batteryPct < 30 ? "warning" : undefined}
            />
            <MetricCell
              icon={Drop}
              label="Ostatni odczyt"
              value={sensor.lastSeenAt}
            />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <Button variant="secondary" onClick={() => onEdit(sensor)}>
          <Icon icon={PencilSimple} size={16} />
          Edytuj
        </Button>
        <button
          type="button"
          onClick={() => setDebugOpen((v) => !v)}
          aria-expanded={debugOpen}
          aria-controls={`sensor-debug-${sensor.id}`}
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-ink-muted transition-colors duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-surface-2 hover:text-ink"
        >
          <span>Szczegóły techniczne</span>
          <Icon
            icon={CaretDown}
            size={14}
            className={cn(
              "transition-transform duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
              debugOpen && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Expandable technical details (300ms ease-decelerate; reduced-motion safe). */}
      <AnimatePresence initial={false}>
        {debugOpen && (
          <motion.div
            id={`sensor-debug-${sensor.id}`}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-3">
              <SensorDebug sensor={sensor} readings={readings} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Per-card technical details panel for troubleshooting (sensor id, kind enum,
 * field id, GPS coordinates, status, battery, last seen) plus, for ground
 * probes, the recent readings series as a compact mono table.
 */
function SensorDebug({
  sensor,
  readings,
}: {
  sensor: Sensor;
  readings?: SensorReading[];
}) {
  const [lng, lat] = sensor.position.coordinates;
  const recent = readings ? [...readings].reverse().slice(0, 6) : [];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-4">
      <span className="text-xs font-medium tracking-[0.02em] text-ink-muted">
        Dane techniczne
      </span>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <Row k="ID" v={sensor.id} />
        <Row k="Typ (enum)" v={sensor.kind} />
        <Row k="ID pola" v={sensor.fieldId || "-"} />
        <Row
          k="Pozycja"
          v={`${lng.toFixed(5)}, ${lat.toFixed(5)}`}
          icon={MapPin}
        />
        <Row k="Status" v={sensor.status} />
        <Row k="Bateria" v={`${sensor.batteryPct}%`} />
        <Row k="Ostatni odczyt" v={sensor.lastSeenAt} />
      </dl>

      {sensor.kind === "glebowy" && recent.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-[0.02em] text-ink-muted">
            Ostatnie odczyty ({recent.length})
          </span>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-2 text-left font-medium text-ink-muted">
                  <th scope="col" className="px-2 py-1.5">Data</th>
                  <th scope="col" className="px-2 py-1.5 text-right">Wilg.</th>
                  <th scope="col" className="px-2 py-1.5 text-right">Temp.</th>
                  <th scope="col" className="px-2 py-1.5 text-right">EC</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr
                    key={r.date}
                    className="border-t border-border font-mono tabular-nums text-ink-muted"
                  >
                    <td className="px-2 py-1.5">{r.date}</td>
                    <td className="px-2 py-1.5 text-right">{r.soilMoisturePct}%</td>
                    <td className="px-2 py-1.5 text-right">
                      {r.soilTempC.toFixed(1)}°C
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {r.ecDsM.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  k,
  v,
  icon,
}: {
  k: string;
  v: string;
  icon?: React.ForwardRefExoticComponent<import("@phosphor-icons/react").IconProps>;
}) {
  return (
    <>
      <dt className="text-ink-subtle">{k}</dt>
      <dd className="flex items-center gap-1 font-mono tabular-nums text-ink">
        {icon && <Icon icon={icon} size={12} className="text-ink-subtle" />}
        <span className="truncate">{v}</span>
      </dd>
    </>
  );
}

/** Shared metric cell (DESIGN §4 "vital signs grid"): label, large mono value, unit. */
function MetricCell({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ForwardRefExoticComponent<import("@phosphor-icons/react").IconProps>;
  label: string;
  value: string;
  unit?: string;
  /** Status color applied to the value only (DESIGN §4 "on the value, not the row"). */
  tone?: "warning" | "urgent";
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <Icon icon={icon} size={14} className="text-ink-subtle" />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums text-ink",
            tone === "warning" && "text-warning",
            tone === "urgent" && "text-urgent",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </div>
    </div>
  );
}

function batteryIcon(pct: number) {
  if (pct < 15) return BatteryLow;
  if (pct < 30) return BatteryWarning;
  return BatteryFull;
}

function statusPill(s: SensorStatus): {
  status: import("@/lib/types").FieldStatus;
  label: string;
} {
  if (s === "online") return { status: "normal", label: "Online" };
  if (s === "warning") return { status: "warning", label: "Ostrzeżenie" };
  return { status: "urgent", label: "Offline" };
}
