import { notes, sensorImages, sensorReadings } from "@/lib/mock/data";
import type { Note } from "@/lib/types";
import type { ISensorProvider } from "@/lib/providers/types";

/** Mock sensor provider: serves in-memory imagery, soil readings and notes. */
export class MockSensorProvider implements ISensorProvider {
  async getImages(
    sensorId: string,
    channel?: import("@/lib/types").ImageChannel,
  ) {
    return sensorImages
      .filter((img) => img.sensorId === sensorId && (!channel || img.channel === channel))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getReadings(sensorId: string) {
    return sensorReadings
      .filter((r) => r.sensorId === sensorId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getNotes(sensorId: string): Promise<Note[]> {
    return notes
      .filter((n) => n.sensorId === sensorId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
