"use client";

import { cn } from "@/lib/utils/cn";
import type { FieldStatus } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import {
  Warning,
  CheckCircle,
  ClockAfternoon,
  Info,
  Siren,
} from "@phosphor-icons/react";

/**
 * Status pill using the paired foreground + background tint palette
 * (DESIGN.sh §2, §4). Color is never the sole signal: each status pairs
 * with an icon + text label for color-blind independence.
 *
 * Keep text short. Status colors never appear as large fills (DESIGN.sh).
 */
type PillDef = {
  label: string;
  fg: string;
  bg: string;
  icon: React.ForwardRefExoticComponent<
    import("@phosphor-icons/react").IconProps
  >;
};

const PILL: Record<FieldStatus, PillDef> = {
  urgent: { label: "Krytyczny", fg: "text-urgent", bg: "bg-urgent-bg", icon: Siren },
  warning: { label: "Uwaga", fg: "text-warning", bg: "bg-warning-bg", icon: Warning },
  normal: { label: "Norma", fg: "text-normal", bg: "bg-normal-bg", icon: CheckCircle },
  "follow-up": {
    label: "Do kontroli",
    fg: "text-follow-up",
    bg: "bg-follow-up-bg",
    icon: ClockAfternoon,
  },
  info: { label: "Info", fg: "text-info", bg: "bg-info-bg", icon: Info },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: FieldStatus;
  /** Override the default Polish label if needed. */
  label?: string;
  className?: string;
}) {
  const def = PILL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium",
        def.fg,
        def.bg,
        className,
      )}
    >
      <Icon icon={def.icon} size={12} />
      {label ?? def.label}
    </span>
  );
}
