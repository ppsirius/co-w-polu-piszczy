import { fields } from "@/lib/mock/data";
import { cropLabel } from "@/lib/labels";
import { Card } from "@/components/ui/Card";

export default function CropRotationPage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Płodozmian
        </h2>
        <p className="text-sm text-ink-muted">
          Typ uprawy, data siewu i przewidywany termin zbioru dla każdego pola.
        </p>
      </header>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1 text-left text-xs font-medium tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3">Pole</th>
              <th scope="col" className="px-4 py-3">Uprawa</th>
              <th scope="col" className="px-4 py-3">Siew</th>
              <th scope="col" className="px-4 py-3">Planowany zbiór</th>
              <th scope="col" className="px-4 py-3">Temp. baza</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr
                key={field.id}
                className="border-b border-border last:border-0 hover:bg-surface-1"
              >
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                  {field.name}
                  <span className="ml-2 font-mono text-xs font-normal text-ink-subtle">
                    {field.areaHa.toFixed(1)} ha
                  </span>
                </th>
                <td className="px-4 py-3 text-ink">{cropLabel[field.crop.crop]}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">{field.crop.sowingDate}</td>
                <td className="px-4 py-3 font-mono text-ink-muted">
                  {field.crop.expectedHarvestDate}
                </td>
                <td className="px-4 py-3 font-mono text-ink-muted">
                  {field.crop.baseTempC}°C
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
