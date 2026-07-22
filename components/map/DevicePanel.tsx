"use client";

import Link from "next/link";
import { sensors } from "@/lib/mock/data";
import { sensorKindLabel, sensorStatusLabel } from "@/lib/labels";
import { Icon } from "@/components/ui/icon";
import { CellTower, BatteryFull, BatteryWarning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { SensorStatus } from "@/lib/types";

/**
 * Left device panel (brief §2.B). Lists all active devices assigned to crops.
 * Offline/warning devices use a left-border accent stripe to flag status
 * without alarming color fills (medication-list pattern, DESIGN.sh §4).
 */
const STATUS_STRIPE: Record<SensorStatus, string> = {
  online: "border-l-transparent",
  warning: "border-l-[3px] border-l-warning",
  offline: "border-l-[3px] border-l-urgent",
};

const STATUS_DOT: Record<SensorStatus, string> = {
  online: "bg-normal",
  warning: "bg-warning",
  offline: "bg-urgent",
};

export function DevicePanel() {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 border-r border-border bg-canvas">
      <div className="flex items-center gap-2 px-4 py-3">
        <Icon icon={CellTower} size={18} className="text-ink-subtle" />
        <h2 className="text-sm font-semibold text-ink">Urządzenia</h2>
        <span className="ml-auto font-mono text-xs text-ink-subtle">
          {sensors.length}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
        {sensors.map((sensor) => (
          <li key={sensor.id}>
            <Link
              href={`/sensor/${sensor.id}`}
              className={cn(
                "flex flex-col gap-1 rounded-md bg-surface-1 px-3 py-2 transition-colors hover:bg-surface-2",
                STATUS_STRIPE[sensor.status],
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">
                  {sensor.name}
                </span>
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    STATUS_DOT[sensor.status],
                  )}
                  aria-hidden
                />
              </div>
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>{sensorKindLabel[sensor.kind]}</span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Icon
                    icon={
                      sensor.batteryPct < 30 ? BatteryWarning : BatteryFull
                    }
                    size={12}
                    className={
                      sensor.batteryPct < 30
                        ? "text-warning"
                        : "text-ink-subtle"
                    }
                  />
                  {sensor.batteryPct}%
                </span>
              </div>
              <span className="text-xs text-ink-subtle">
                {sensorStatusLabel[sensor.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
