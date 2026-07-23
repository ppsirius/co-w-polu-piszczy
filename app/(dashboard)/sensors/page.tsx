import { SensorsView } from "@/components/sensors/SensorsView";

/**
 * /sensors — combined view of every device (merges the former soil-sensor cards
 * and sensor-settings table). Soil probes show moisture/temp/EC metrics; the
 * rest show status/battery/last-seen. Each card is editable and expandable for
 * technical/debug details.
 */
export default function SensorsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 p-6">
      <SensorsView />
    </div>
  );
}
