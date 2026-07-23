import { MapView } from "@/components/map/MapView";
import { DevicePanel } from "@/components/map/DevicePanel";
import { DateSelector } from "@/components/map/DateSelector";
import { LayerFilter } from "@/components/map/LayerFilter";
import { LayerLegend } from "@/components/map/LayerLegend";

export default function MapaPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar: global date + layer filters */}
      <div className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-2.5">
        <DateSelector />
        <LayerFilter />
      </div>

      {/* Body: device list + map */}
      <div className="flex min-h-0 flex-1">
        <DevicePanel />
        <div className="relative min-w-0 flex-1">
          <MapView />
          <LayerLegend />
        </div>
      </div>
    </div>
  );
}
