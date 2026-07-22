import { cn } from "@/lib/utils/cn";
import { TrendArrow } from "@/components/ui/TrendArrow";
import type { Trend } from "@/lib/types";

/**
 * Metric tile (vital-signs-grid pattern, DESIGN.sh §4).
 * Large monospaced value (tabular figures for alignment) + optional unit,
 * trend arrow, and supporting label. Numeric value is monospaced per the
 * clinical-data convention.
 */
export function MetricTile({
  label,
  value,
  unit,
  trend,
  className,
}: {
  label: string;
  /** Pre-formatted value string. */
  value: string;
  unit?: string;
  trend?: Trend;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium tracking-wide text-ink-muted">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-ink">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-ink-muted">{unit}</span>
        )}
        {trend && <TrendArrow trend={trend} className="ml-1" />}
      </div>
    </div>
  );
}
