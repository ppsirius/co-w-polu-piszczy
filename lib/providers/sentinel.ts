/**
 * Sentinel-2 satellite provider (server-only).
 *
 * Renders NDVI via the Sentinel Hub Process API:
 *   - getNdviTile(z, x, y, date): a PNG XYZ tile for the map's raster overlay.
 *     POSTs an evalscript (NDVI from B04 + B08, project color ramp) with the
 *     tile's bbox + a date window to /api/v1/process. No WMS instance config
 *     needed - the Process API takes the evalscript directly in the body.
 *   - getNdviAt / getNdviSeries: the zonal MEAN NDVI for a field polygon, via
 *     /api/v1/statistics. Powers the legend value / DevicePanel.
 *
 * Security: the OAuth2 token is fetched server-side (sentinel-auth.ts) and the
 * request is made here, then returned to the client through the /api/tiles/ndvi
 * proxy. The browser never sees the Sentinel Hub URL or token.
 */
import { getField } from "@/lib/mock/data";
import {
  SENTINEL_API_BASE,
  getSentinelToken,
  hasSentinelCredentials,
  invalidateSentinelToken,
} from "@/lib/providers/sentinel-auth";
import type { IsoDate, NdviSample } from "@/lib/types";
import type { ISatelliteProvider } from "@/lib/providers/types";

const PROCESS_URL = `${SENTINEL_API_BASE}/api/v1/process`;
const STATS_URL = `${SENTINEL_API_BASE}/api/v1/statistics`;

// Up to this much cloud cover is allowed through (percent).
const MAX_CC = 30;
// How many days around the requested date to search for a cloud-free acquisition.
const DATE_WINDOW_DAYS = 2;
const TILE_SIZE = 256;

/**
 * NDVI evalscript mirroring the ramp in lib/geojson.ts (ndviColor): bare brown
 * -> yellow -> green. Computed server-side by Sentinel Hub from B04 (red) +
 * B08 (NIR). Thresholds nudged (+0.01) so the ramp boundaries match exactly.
 */
const NDVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08"], units: "REFLECTANCE" }],
    output: { bands: 4, sampleType: "AUTO" },
    mosaicking: "SIMPLE"
  };
}
function evaluatePixel(sample) {
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < 0.2)  return [0x92/255, 0x40/255, 0x0E/255, 1];
  if (ndvi < 0.41) return [0xCA/255, 0x8A/255, 0x04/255, 1];
  if (ndvi < 0.61) return [0xA3/255, 0xA3/255, 0x20/255, 1];
  if (ndvi < 0.76) return [0x4D/255, 0x7C/255, 0x0F/255, 1];
  return [0x05/255, 0x96/255, 0x69/255, 1];
}
`;

export class Sentinel2SatelliteProvider implements ISatelliteProvider {
  private constructor() {}

  /** Factory: only constructable when credentials are present. */
  static create(): Sentinel2SatelliteProvider | null {
    if (!hasSentinelCredentials()) return null;
    return new Sentinel2SatelliteProvider();
  }

  /**
   * Render an XYZ tile as PNG via the Process API. Returns null when there is no
   * cloud-free imagery for the date window (the proxy then 404s and Mapbox
   * shows an empty tile - no retry storm).
   */
  async getNdviTile(
    z: number,
    x: number,
    y: number,
    date: IsoDate,
  ): Promise<ArrayBuffer | null> {
    const [west, south, east, north] = xyzToBbox(x, y, z);
    const body = {
      input: {
        bounds: {
          bbox: [west, south, east, north],
          properties: {
            crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
          },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              from: `${date}T00:00:00Z`,
              to: `${date}T23:59:59Z`,
              maxCloudCoverage: MAX_CC,
            },
          },
        ],
      },
      output: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        responses: [
          { identifier: "default", format: { type: "image/png" } },
        ],
      },
      evalscript: NDVI_EVALSCRIPT.trim(),
    };

    return this.fetchPng(PROCESS_URL, body, date);
  }

  /** Zonal mean NDVI for a field at-or-before `asOf` (legend / DevicePanel). */
  async getNdviAt(
    fieldId: string,
    asOf: IsoDate,
  ): Promise<NdviSample | undefined> {
    const field = getField(fieldId);
    if (!field) return undefined;
    const mean = await this.fetchZonalMean(field.polygon, asOf);
    if (mean === null) return undefined;
    return { fieldId, date: asOf, value: mean };
  }

  async getNdviSeries(_fieldId: string): Promise<NdviSample[]> {
    // Full series would page over acquisition dates; out of scope for the map's
    // current needs (mean-at-date + raster). Returns empty so callers degrade
    // gracefully (dashboard card uses trend from the mock until implemented).
    return [];
  }

  // --- internals ---------------------------------------------------------

  /**
   * POST an evalscript to the Process API and return the PNG bytes. The date
   * window widens the acquisition search so a single cloudy day doesn't blank a
   * tile. 401 -> refresh token once and retry; anything else -> null.
   */
  private async fetchPng(
    url: string,
    body: unknown,
    date: IsoDate,
    attempt = 0,
  ): Promise<ArrayBuffer | null> {
    const token = await getSentinelToken();
    const payload = withDateWindow(body as object, date);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify(payload),
      // A tile for a given date+xyz never changes; cache aggressively.
      next: { revalidate: 86400 },
    });

    if (res.status === 401 && attempt === 0) {
      // Token expired between auth and request - refresh once and retry.
      invalidateSentinelToken();
      return this.fetchPng(url, body, date, 1);
    }
    if (!res.ok) return null;
    return res.arrayBuffer();
  }

  private async fetchZonalMean(
    polygon: GeoJSON.Polygon,
    date: IsoDate,
  ): Promise<number | null> {
    const token = await getSentinelToken();
    // Zonal stats search a WIDER window than tiles: recent Sentinel-2 L2A can
    // lag days-to-weeks before CDSE indexes it, so the requested date may have
    // no processed acquisition yet. Searching +/- STATS_WINDOW_DAYS lands on the
    // nearest available (cloud-free) pass.
    const body = withDateWindowStats(
      {
        input: {
          bounds: {
            geometry: polygon,
            properties: {
              crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
            },
          },
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: { maxCloudCoverage: MAX_CC },
            },
          ],
        },
        aggregation: {
          timeRange: {},
          aggregationInterval: { of: "P1D" },
          evalscript: STATS_NDVI_SCRIPT,
        },
      },
      date,
    );

    const res = await fetch(STATS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as StatsResponse;
    // CDSE returns one entry per day in the window that had imagery; pick the
    // one closest to the requested date and read its mean NDVI.
    const intervals = payload.data ?? [];
    if (intervals.length === 0) return null;

    const target = Date.parse(`${date}T00:00:00Z`);
    const nearest = intervals.reduce((best, cur) => {
      const curDist = Math.abs(Date.parse(cur.interval.from) - target);
      const bestDist = Math.abs(Date.parse(best.interval.from) - target);
      return curDist < bestDist ? cur : best;
    });
    const mean = nearest.outputs?.ndvi?.bands?.B0?.stats?.mean;
    return typeof mean === "number" ? Math.round(mean * 1000) / 1000 : null;
  }
}

// Statistics evalscript: emit per-pixel NDVI + a dataMask output. The
// statistics endpoint REQUIRES dataMask (for valid-pixel accounting) - omitting
// it returns 400 "Output dataMask requested but missing from function setup()".
// Output id is "ndvi" so the response path is outputs.ndvi.bands.B0.stats.mean.
const STATS_NDVI_SCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"], units: "REFLECTANCE" }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32", noDataValue: NaN },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ],
    mosaicking: "SIMPLE"
  };
}
function evaluatePixel(sample) {
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return { ndvi: [ndvi], dataMask: [sample.dataMask] };
}
`;

/**
 * Set the acquisition window on a Process/statistics payload centered on `date`
 * (+/- DATE_WINDOW_DAYS). Done as a post-process step so the body literals stay
 * readable above. Sentinel Hub expects {from, to} ISO strings, NOT an array.
 */
function withDateWindow<T extends object>(body: T, date: IsoDate): T {
  const start = isoShift(date, -DATE_WINDOW_DAYS);
  const end = isoShift(date, DATE_WINDOW_DAYS);
  const out = structuredClone(body) as Record<string, unknown>;
  const input = (out.input ?? {}) as Record<string, unknown>;
  const data = (input.data ?? []) as Record<string, unknown>[];
  for (const d of data) {
    const filter = (d.dataFilter ?? {}) as Record<string, unknown>;
    filter.from = `${start}T00:00:00Z`;
    filter.to = `${end}T23:59:59Z`;
    d.dataFilter = filter;
  }
  input.data = data;
  out.input = input;
  return out as T;
}

function isoShift(iso: IsoDate, days: number): IsoDate {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Like withDateWindow but with a WIDER search range for the statistics endpoint.
 * Sentinel-2 L2A can lag days-to-weeks before CDSE indexes recent acquisitions,
 * so a +/-2 day tile window would miss the nearest pass for the zonal mean. We
 * search +/-STATS_WINDOW_DAYS and pick the closest day that actually returned
 * imagery.
 */
const STATS_WINDOW_DAYS = 16;
function withDateWindowStats<T extends object>(body: T, date: IsoDate): T {
  const start = isoShift(date, -STATS_WINDOW_DAYS);
  const end = isoShift(date, STATS_WINDOW_DAYS);
  const out = structuredClone(body) as Record<string, unknown>;
  const input = (out.input ?? {}) as Record<string, unknown>;
  const data = (input.data ?? []) as Record<string, unknown>[];
  for (const d of data) {
    const filter = (d.dataFilter ?? {}) as Record<string, unknown>;
    filter.from = `${start}T00:00:00Z`;
    filter.to = `${end}T23:59:59Z`;
    d.dataFilter = filter;
  }
  input.data = data;
  out.input = input;
  // Also set the aggregation timeRange (stats-specific field).
  const aggregation = (out.aggregation ?? {}) as Record<string, unknown>;
  aggregation.timeRange = { from: `${start}T00:00:00Z`, to: `${end}T23:59:59Z` };
  out.aggregation = aggregation;
  return out as T;
}

/**
 * Convert an XYZ tile index to a WGS84 (EPSG:4326) bounding box [W, S, E, N].
 * Standard Web-Mercator slippy-map math.
 */
function xyzToBbox(
  x: number,
  y: number,
  z: number,
): [number, number, number, number] {
  const n = Math.pow(2, z);
  const w = (x / n) * 360 - 180;
  const e = ((x + 1) / n) * 360 - 180;
  const latTop = tile2lat(y, z);
  const latBottom = tile2lat(y + 1, z);
  return [w, latBottom, e, latTop];
}

function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Sentinel Hub statistics API response (subset we read). */
type StatsResponse = {
  data?: {
    interval: { from: string; to: string };
    outputs?: {
      ndvi?: {
        bands?: {
          B0?: {
            stats?: { mean?: number; sampleCount?: number };
          };
        };
      };
    };
  }[];
};
