"use client";

import type { IconProps as PhosphorIconProps, IconWeight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

/**
 * Phosphor icon component type. Each Phosphor icon is a forward-ref component
 * accepting IconProps. We type `name` as this so callers pass a Phosphor icon.
 */
type PhosphorIcon = React.ForwardRefExoticComponent<PhosphorIconProps>;

export type IconComponentProps = Omit<PhosphorIconProps, "ref"> & {
  /** A Phosphor icon component, e.g. `Leaf`. */
  icon: PhosphorIcon;
  className?: string;
};

/** Standardized project-wide weight so the icon family reads as one set. */
const STANDARD_WEIGHT: IconWeight = "duotone";

/**
 * Reusable icon wrapper. @phosphor-icons/react uses React Context internally,
 * which forces it into the Client Component graph. This wrapper isolates that
 * boundary so icons can be rendered inside Server Components via composition.
 */
export function Icon({ icon: PhosphorIcon, size = 20, className, ...rest }: IconComponentProps) {
  return (
    <PhosphorIcon
      size={size}
      weight={STANDARD_WEIGHT}
      aria-hidden
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
}
