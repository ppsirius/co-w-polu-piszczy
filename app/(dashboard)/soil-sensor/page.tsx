import { SoilReadingsTable } from "@/components/soil/SoilReadingsTable";

export default function SoilSensorPage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Czujnik glebowy
        </h2>
        <p className="text-sm text-ink-muted">
          Najnowsze odczyty wilgotności, temperatury i przewodności gleby z sond polowych.
        </p>
      </header>
      <SoilReadingsTable />
    </div>
  );
}
