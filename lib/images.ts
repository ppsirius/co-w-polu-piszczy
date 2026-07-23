/**
 * Centralized remote image sources. Keeping the base photo URL + sizing params
 * here means the dashboard (and any future surface) renders the same placeholder
 * and the `images.unsplash.com` host in next.config.ts has one reason to exist.
 *
 * The photo is "brown wheat at daytime" by Tomasz Filipek (Unsplash). It is a
 * single shared placeholder for every field card; real per-field imagery would
 * come from the satellite/sensor providers behind the BFF.
 */
const FIELD_PHOTO_BASE =
  "https://images.unsplash.com/photo-1543257580-7269da773bf5";

export const FIELD_PLACEHOLDER_IMAGE = {
  src: `${FIELD_PHOTO_BASE}?auto=format&fit=crop&w=800&q=70`,
} as const;
