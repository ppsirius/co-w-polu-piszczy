"use client";

import { useId } from "react";
import { Icon } from "@/components/ui/icon";
import { ArrowUp, ArrowDown, Minus } from "@phosphor-icons/react";
import type { Trend } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Compact trend indicator. Up = normal-green, down = urgent-red, flat = muted.
 * Paired with an icon so it's not color-only (a11y, DESIGN.sh).
 */
const TREND_DEF: Record<
  Trend,
  {
    icon: React.ForwardRefExoticComponent<import("@phosphor-icons/react").IconProps>;
    color: string;
    label: string;
  }
> = {
  up: { icon: ArrowUp, color: "text-normal", label: "wzrost" },
  down: { icon: ArrowDown, color: "text-urgent", label: "spadek" },
  flat: { icon: Minus, color: "text-ink-subtle", label: "bez zmian" },
};

export function TrendArrow({
  trend,
  className,
}: {
  trend: Trend;
  className?: string;
}) {
  const def = TREND_DEF[trend];
  const labelId = useId();
  return (
    <span
      role="img"
      aria-labelledby={labelId}
      className={cn("inline-flex items-center", def.color, className)}
    >
      <Icon icon={def.icon} size={14} weight="bold" />
      <span id={labelId} className="sr-only">
        {def.label}
      </span>
    </span>
  );
}
