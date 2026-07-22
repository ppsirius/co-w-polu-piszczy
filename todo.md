# cowpolupiszczy — plan realizacji

AgroTech platform do monitoringu pól. Next.js 16.2.11 (App Router, params async), React 19, Tailwind v4, bun. Design: Carbon Health (jasny, teal `#0A9E8F`). Mock-first + warstwa providerów — działa bez tokenu Mapbox i bez hardware'u.

Legenda: `[ ]` do zrobienia · `[~]` w trakcie · `[x]` gotowe

---

## T0 — Inicjalizacja + deps `[x]`
- [x] Utworzyć `todo.md`
- [x] Doinstalować: `zustand`, `maplibre-gl`, `@phosphor-icons/react`, `motion`, `clsx`, `tailwind-merge`
- [x] Zweryfikować `bun dev` rusza bez błędów (HTTP 200, Turbopack)

## T1 — Fundament designu `[x]`
- [x] `globals.css`: tokeny Carbon w `@theme inline` (canvas/surface/ink/brand/status fg+bg, radius, shadows, motion)
- [x] Fonty Inter + JetBrains Mono via `next/font` w `layout.tsx`
- [x] Focus ring `2px solid #0A9E8F` + 2px offset, `prefers-reduced-motion`
- [x] `lib/utils/cn.ts` (clsx + tailwind-merge)
- [x] `components/ui/icon.tsx` (wrapper izolujący Phosphor do client graph)
- [x] Czysty placeholder potwierdzający (HTTP 200, typecheck OK)

## T2 — Domena + store `[x]`
- [x] `lib/types.ts`: Field (GeoJSON polygon), Sensor, CropRotation, NdviSample, WeatherDay, Note, SensorImage/Reading, FieldMetrics
- [x] `lib/mock/data.ts`: 3 pola (pszenica ozima, rzepak, kukurydza), 7 czujników, serie RGB/IR/NDVI, serie NDVI/GDD/temp deterministyczne
- [x] `lib/store.ts` Zustand: selectedFieldId, selectedDate, layer, selectedSensorId + akcje

## T3 — Warstwa providerów `[x]`
- [x] `lib/providers/types.ts`: ISatelliteProvider, IWeatherProvider, ISensorProvider
- [x] Mock implementacje (satellite/weather/sensor) opakowujące mock/data.ts
- [x] `lib/providers/registry.ts` (podmiana na real API = jeden plik)
- [x] `lib/metrics.ts` (agregacja FieldMetrics z providerów - współdzielona z BFF)

## T4 — Shell + nawigacja `[x]`
- [x] `components/shell/Sidebar.tsx` (8 modułów + ikony Phosphor, aktywny = teal)
- [x] `components/shell/TopBar.tsx` + `DashboardShell.tsx` (tytuł z pathname)
- [x] `app/(dashboard)/layout.tsx` (route group) + `PagePlaceholder.tsx`
- [x] 9 tras (8 modułów + dynamiczny czujnik), build OK (11 stron prerendered)
- [x] Przełączenie na Mapbox (token w `.env.local`, gitignored; `.env.local.example` z placeholderem)

## T5 — Komponenty UI + Panel główny `[x]`
- [x] `ui/`: Card (hover-lift), StatusPill (paired fg+bg + ikona), TrendArrow, MetricTile (mono + trend), Button, Skeleton
- [x] `lib/labels.ts` (PL etykiety enumów)
- [x] `fields/FieldCard.tsx` (zdjęcie + NDVI/Temp/GDD/Rosa, skeleton wg layoutu), `FieldGrid.tsx`
- [x] Strona Panel główny (FieldGrid z 3 polami, SSR OK)
- [x] `next.config.ts` remotePatterns dla picsum

## T5 — Komponenty UI + Panel główny `[ ]`
- [ ] `ui/`: Card (hover-lift), StatusPill (paired fg+bg), MetricTile (mono + TrendArrow), Button, Skeleton
- [ ] `fields/FieldCard.tsx` (zdjęcie + temp/GDD/rosa/NDVI trend), `FieldGrid.tsx`
- [ ] Strona Panel główny z danymi z providerów

## T6 — Mapa (Mapbox) `[x]`
- [x] `lib/mapbox.ts` (token z env) + `lib/geojson.ts` (FeatureCollection pól/czujników, skala NDVI)
- [x] `map/MapView.tsx` (client leaf, SSR-safe): tile satelitarne, poligony wg warstwy, piny + popupy czujników, graceful notice bez tokenu
- [x] `map/LayerFilter.tsx` (5 warstw, pill grid) + `map/DateSelector.tsx` (bound do store) + `map/DevicePanel.tsx` (lista z border-stripe statusem)
- [x] Strona `/mapa` (toolbar + panel + mapa), build OK, render OK

## T7 — Inspekcja czujnika + timeline `[x]`
- [x] `sensor/ImageBrowser.tsx` (toggle RGB/IR/NDVI, prefetch sąsiadów, skeleton)
- [x] `sensor/TimelineSlider.tsx` (`useMotionValue` dla thumba, commit przy pointerup/debounce, klawiatura, tick marks)
- [x] `sensor/NotesPanel.tsx` (lista + dodawanie, stan lokalny)
- [x] Strona `/sensor/[id]` (params async, notFound dla brakującego czujnika)
- [x] Przemianowanie tras na endpointy angielskie (/map, /soil-sensor, ...) + StatusPill use-client

## T8 — BFF `[x]`
- [x] `app/api/fields/[id]/metrics/route.ts` (GET, params async, `await context.params`)
- [x] Agregacja NDVI + wilgotność + pogoda w jeden JSON (współdzielona z dashboardem)
- [x] Clamping zakresu dat + 404 dla brakującego pola, `resolvedDate` w odpowiedzi
- [x] Zweryfikowane na żywo (200/404/clamp OK)

## T9 — Pozostałe moduły `[x]`
- [x] Czujnik glebowy (`/soil-sensor`): karty odczytów wilg./temp./EC z providerów, status-pill + skeleton
- [x] Płodozmian (`/crop-rotation`): tabela pól z uprawą, siewem, zbiorem, temp. bazową
- [x] Ocena pól AI (`/ai-assessment`): karty z heurystyczną oceną + rekomendacją (NDVI + wilgotność)
- [x] Zarządzanie polami (`/field-management`): karty pól + link do mapy
- [x] Ustawienia czujników (`/sensor-settings`): tabela urządzeń (status/bateria/ostatni odczyt)
- [x] Członkowie (`/members`): roster zespołu z rolami
- [x] Build OK (10 tras), smoke-test wszystkich stron 200/0 błędów

---

## Status: MVP ukończone

Aplikacja w pełni nawigowalna i funkcjonalna (mock-first). Działające elementy:
- **Panel główny** — karty 3 pól z metrykami (NDVI/Temp/GDD/Rosa) z providerów
- **Mapa** — Mapbox (satelita, poligony, piny czujników, popupy, 5 warstw, selektor daty, panel urządzeń)
- **Inspekcja czujnika** — przeglądarka obrazów RGB/IR/NDVI + zoptymalizowany timeline + notatki
- **BFF** — `/api/fields/[id]/metrics` agregujący dane w jeden JSON
- **6 modułów** operacyjnych z danymi demonstracyjnymi

**Architektura gotowa na skalowanie:** warstwa providerów (interfejsy + mock + registry) pozwala podmienić dane na realne API (Sentinel-2, OpenWeather, IoT) jednym plikiem — bez zmian w UI.

**Następne kroki (poza zakresem MVP):** realny auth/CRB pól, podmiana providerów na live API, rysowanie poligonów (`@mapbox/mapbox-gl-draw`), persystencja notatek, ML model dla oceny AI.
