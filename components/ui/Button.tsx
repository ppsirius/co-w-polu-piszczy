import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  // Teal CTA. White-on-teal passes AA for bold/button text (DESIGN.sh a11y).
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:scale-[0.98]",
  secondary:
    "bg-canvas text-ink border border-border-strong hover:bg-surface-2 active:scale-[0.98]",
  ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink active:scale-[0.98]",
};

/**
 * Button. Min 36×36px desktop target (DESIGN.sh). Tactile feedback via
 * active scale. Forwarded ref so it composes with links etc.
 */
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-all duration-[100ms] ease-[cubic-bezier(0.4,0,0.2,1)] disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
