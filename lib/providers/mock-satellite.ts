import { ndviSamples } from "@/lib/mock/data";
import type { IsoDate } from "@/lib/types";
import type { ISatelliteProvider } from "@/lib/providers/types";

/** Mock satellite provider: serves the in-memory NDVI dataset. */
export class MockSatelliteProvider implements ISatelliteProvider {
  async getNdviSeries(fieldId: string) {
    return ndviSamples
      .filter((s) => s.fieldId === fieldId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getNdviAt(
    fieldId: string,
    asOf: IsoDate,
  ) {
    const series = await this.getNdviSeries(fieldId);
    // Latest sample at or before the requested date.
    return [...series].reverse().find((s) => s.date <= asOf);
  }

  /**
   * No raster capability in mock mode. Returning null tells the tile proxy to
   * 404, and the map to keep coloring polygons (the zonal stat from
   * getNdviAt) instead of showing imagery.
   */
  async getNdviTile(): Promise<ArrayBuffer | null> {
    return null;
  }
}
