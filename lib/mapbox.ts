/**
 * Mapbox access token. Read from the client-exposed env var.
 * The token lives in .env.local (gitignored). When swapping to a different
 * provider later, the map components are the only files that change.
 */
export const MAPBOX_TOKEN: string =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function hasMapboxToken(): boolean {
  return MAPBOX_TOKEN.length > 0 && !MAPBOX_TOKEN.startsWith("pk.REPLACE");
}
