"use client";

import { useEffect, useState } from "react";
import { sensorProvider } from "@/lib/providers/registry";
import { sensors } from "@/lib/mock/data";
import { sensorKindLabel } from "@/lib/labels";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { Drop, Thermometer, Lightning } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/icon";
import type { SensorStatus, SensorReading } from "@/lib/types";

/**
 * Soil-sensor dashboard (brief §2.A + §2.C). For each ground sensor, shows the
 * latest moisture / temperature / EC as a metric grid. Rows follow the
 * medication-list pattern: status conveyed via a left-border stripe + pill.
 */
const GROUND_SENSORS = sensors.filter((s) => s.kind === "glebowy");

export function SoilReadingsTable() {
  const [readings, setReadings] = useState<Record<string, SensorReading[] | undefined>>({});

  useEffect(() => {
    let active = true;
    Promise.all(
      GROUND_SENSORS.map((s) => sensorProvider.getReadings(s.id)),
    ).then((results) => {
      if (!active) return;
      const map: Record<string, SensorReading[]> = {};
      GROUND_SENSORS.forEach((s, i) => {
        map[s.id] = results[i];
      });
      setReadings(map);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {GROUND_SENSORS.map((sensor) => {
        const series = readings[sensor.id];
        const latest = series ? [...series].reverse()[0] : undefined;
        const status = statusPill(sensor.status);
        return (
          <Card key={sensor.id} className="p-5">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-base font-semibold text-ink">{sensor.name}</h3>
                <p className="text-xs text-ink-muted">
                  {sensorKindLabel[sensor.kind]} · bateria {sensor.batteryPct}%
                </p>
              </div>
              <StatusPill status={status.status} label={status.label} />
            </div>

            {latest === undefined ? (
              series === undefined ? (
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <p className="pt-4 text-sm text-ink-muted">Brak odczytów.</p>
              )
            ) : (
              <div className="grid grid-cols-3 gap-4 pt-4">
                <SoilMetric
                  icon={Drop}
                  label="Wilgotność"
                  value={`${latest.soilMoisturePct}`}
                  unit="%"
                  tone={latest.soilMoisturePct < 25 ? "warning" : "normal"}
                />
                <SoilMetric
                  icon={Thermometer}
                  label="Temp. gleby"
                  value={`${latest.soilTempC.toFixed(1)}`}
                  unit="°C"
                />
                <SoilMetric
                  icon={Lightning}
                  label="Przewodność"
                  value={`${latest.ecDsM.toFixed(2)}`}
                  unit="dS/m"
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function SoilMetric({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ForwardRefExoticComponent<import("@phosphor-icons/react").IconProps>;
  label: string;
  value: string;
  unit: string;
  tone?: "normal" | "warning";
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <Icon icon={icon} size={14} className="text-ink-subtle" />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono text-2xl font-semibold tabular-nums ${
            tone === "warning" ? "text-warning" : "text-ink"
          }`}
        >
          {value}
        </span>
        <span className="text-sm text-ink-muted">{unit}</span>
      </div>
    </div>
  );
}

function statusPill(s: SensorStatus): {
  status: import("@/lib/types").FieldStatus;
  label: string;
} {
  if (s === "online") return { status: "normal", label: "Online" };
  if (s === "warning") return { status: "warning", label: "Ostrzeżenie" };
  return { status: "urgent", label: "Offline" };
}
