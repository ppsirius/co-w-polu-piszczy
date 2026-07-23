/**
 * Dependency-free planar/spherical geometry helpers for field polygons.
 *
 * The app's `Field` model carries both a `polygon` (GeoJSON) and the derived
 * `areaHa` / `centroid`. The mock dataset hardcodes all three, but when a
 * field is drawn or edited interactively we must recompute the derived values
 * from the polygon. We avoid pulling in turf for what amounts to two formulas.
 *
 * Coordinates follow the GeoJSON / MapLibre convention: [longitude, latitude].
 */
import type { FieldPolygon, LngLat } from "@/lib/types";

const EARTH_RADIUS_M = 6_378_137; // WGS84 equatorial radius
const SQ_M_PER_HA = 10_000;

/** Round to N decimals. */
function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/**
 * Spherical polygon area (shoelace on a sphere) in hectares.
 * Returns 0 for degenerate rings (fewer than 3 unique vertices).
 *
 * Reference: the standard spherical-excess formula. Accurate enough for
 * agricultural parcels (sub-percent error at field scales).
 */
export function polygonAreaHa(ring: LngLat[]): number {
  const n = ring.length;
  if (n < 4) return 0; // closed ring of a real polygon has >= 4 entries

  let total = 0;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % n];
    total += ((lng2 - lng1) * Math.PI) / 180 *
      (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180));
  }
  const areaM2 = Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
  return round(areaM2 / SQ_M_PER_HA, 2);
}

/**
 * Centroid of a polygon's outer ring via the signed-area method. Falls back
 * to the bounding-box center for degenerate rings so callers always get a
 * usable point (e.g. to place a label or default a camera center).
 */
export function polygonCentroid(ring: LngLat[]): LngLat {
  const pts = ring;
  const n = pts.length;
  if (n === 0) return [0, 0];
  if (n < 3) return [...pts[0]];

  let cx = 0;
  let cy = 0;
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  signedArea /= 2;

  if (Math.abs(signedArea) < 1e-12) {
    // Degenerate: fall back to bbox center of the unique vertices.
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    return [
      round((Math.min(...lngs) + Math.max(...lngs)) / 2, 6),
      round((Math.min(...lats) + Math.max(...lats)) / 2, 6),
    ];
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;
  return [round(cx, 6), round(cy, 6)];
}

/** Count unique vertices in a ring (ignoring the closing duplicate). */
export function uniqueVertexCount(ring: LngLat[]): number {
  const seen = new Set<string>();
  for (const [lng, lat] of ring) seen.add(`${lng},${lat}`);
  return seen.size;
}

/**
 * Normalize a raw GeoJSON geometry (as emitted by mapbox-gl-draw) into the
 * app's `FieldPolygon` type: a single-ring polygon with a closed ring.
 * MultiPolygons are reduced to their largest ring. Returns null if the
 * geometry can't yield a valid polygon (fewer than 3 unique vertices).
 */
export function toFieldPolygon(
  geometry: GeoJSON.Geometry | undefined | null,
): FieldPolygon | null {
  if (!geometry) return null;

  let ring: LngLat[] | null = null;
  if (geometry.type === "Polygon") {
    ring = geometry.coordinates[0] as LngLat[];
  } else if (geometry.type === "MultiPolygon") {
    ring = (
      geometry.coordinates
        .map((c) => c[0])
        .sort((a, b) => b.length - a.length)[0] ?? null
    ) as LngLat[] | null;
  }

  if (!ring || uniqueVertexCount(ring) < 3) return null;

  // Ensure the ring is closed (first point === last point) exactly once.
  const closed = ensureClosed(ring);
  return { type: "Polygon", coordinates: [closed] };
}

function ensureClosed(ring: LngLat[]): LngLat[] {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, [...first] as LngLat];
}
