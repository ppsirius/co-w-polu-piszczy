import { cn } from "@/lib/utils/cn";

/**
 * Surface card (DESIGN.sh §4). White canvas, hairline border, subtle card shadow.
 * Optional `interactive` adds hover-lift (elevation) + cursor pointer.
 */
export function Card({
  className,
  interactive = false,
  as: Component = "div",
  ...props
}: React.ComponentProps<"div"> & {
  interactive?: boolean;
  as?: React.ElementType;
}) {
  return (
    <Component
      className={cn(
        "rounded-xl border border-border bg-canvas shadow-card",
        interactive &&
          "cursor-pointer transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[1px] hover:shadow-elevated",
        className,
      )}
      {...props}
    />
  );
}
