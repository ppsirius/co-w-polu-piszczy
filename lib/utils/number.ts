/**
 * Small numeric helpers shared across mock data, color ramps, and UI.
 */

/**
 * Clamp `n` into the closed range [min, max].
 * Equivalent to `Math.min(max, Math.max(min, n))` - values below `min`
 * snap to `min`, values above `max` snap to `max`.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
