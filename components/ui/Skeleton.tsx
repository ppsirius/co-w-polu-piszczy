import { cn } from "@/lib/utils/cn";

/**
 * Skeleton placeholder. DESIGN.sh (and the anti-slop skill) mandate skeletons
 * over spinners. Shapes should match the content they stand in for. Suppressed
 * to a static "Ładowanie..." text under reduced motion (handled by CSS).
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-2 motion-reduce:hidden",
        className,
      )}
      {...props}
    />
  );
}
