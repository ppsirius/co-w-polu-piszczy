<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Project Overview

**cowpolupiszczy** — AgroTech platform for field monitoring. Polish-language UI. Mock-first architecture with provider layer for live API swap. See `DESIGN.md` for the full design system (Carbon Health theme).

## Design System

Full spec in [`DESIGN.md`](./DESIGN.md). Key tokens:

- **Primary accent:** Carbon Teal `#0A9E8F` — CTA, active nav, selected borders, health metrics
- **Clinical status palette:** urgent (red), warning (amber), normal (green), follow-up (violet), info (sky) — each has paired fg + bg tint, never large background fills
- **Typography:** Inter (body) + JetBrains Mono (numeric data) via `next/font`
- **Spacing:** 8px base grid
- **Shadows:** card, elevated, overlay — all tinted, never pure black
- **Motion:** prefers-reduced-motion respected globally; transitions collapse to `0.01ms`
- **Focus ring:** `2px solid var(--color-primary)` with 2px offset

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.2.11 (App Router, Turbopack) |
| React | 19.2.4 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| State | Zustand 5 (three stores: UI state + field CRUD + sensor CRUD) |
| Animation | Motion 12 (`motion/react`) |
| Icons | @phosphor-icons/react (duotone weight) |
| Maps | Mapbox GL JS + Mapbox GL Draw |
| Utilities | clsx + tailwind-merge (`cn()`), TypeScript strict |
| Package manager | Bun |

## Architecture

### Provider Abstraction

Data access goes through interfaces in `lib/providers/types.ts`. The registry (`lib/providers/registry.ts`) is the single switch point and is **env-gated**, so providers flip from mock to live by setting env vars - no code change needed:

- **weather** → Open-Meteo (`lib/providers/open-meteo.ts`), LIVE BY DEFAULT (keyless). Set `OPEN_METEO_BASE_URL=mock` to force the mock dataset.
- **satellite** → Sentinel-2 (`lib/providers/sentinel.ts` + `sentinel-auth.ts`) when `SENTINEL_CLIENT_ID` + `SENTINEL_SECRET` are set, else mock NDVI.
- **sensor** → mock until an IoT provider is added.

```
lib/providers/types.ts       — ISatelliteProvider, IWeatherProvider, ISensorProvider
lib/providers/mock-*.ts      — mock implementations
lib/providers/open-meteo.ts  — live weather (Open-Meteo)
lib/providers/sentinel.ts    — live NDVI tiles + zonal stats (Sentinel-2)
lib/providers/sentinel-auth.ts — OAuth2 token cache (server-only, rate-limit-safe)
lib/providers/registry.ts    — env-gated switch point
```

**Secrets are server-only:** the provider graph (registry → sentinel → sentinel-auth) reads `SENTINEL_*` env vars and must never be imported by a client component. Client components fetch data via the BFF routes; the pure helpers (`pickLayerValues`, `layerColor`, types) live in `lib/geojson.ts`.

### BFF Aggregation

Two client-facing endpoints, both server-only, both behind the provider layer:

- `/api/fields/[id]/metrics` — per-field NDVI + weather + soil folded into one `FieldMetrics` JSON. Logic in `lib/metrics.ts`.
- `/api/map/layers?date=` — all fields × all layers in one payload for the map page. Logic in `lib/map-values.ts`.
- `/api/tiles/ndvi/{z}/{x}/{y}?date=` — NDVI raster tile proxy; injects the Sentinel Hub Bearer token server-side so it never reaches the browser.

### Map Render Modes

`MapView` renders in two modes driven by the active layer (see `lib/store.ts: layer`):

- **NDVI** — a Sentinel-2 RASTER overlay (real intra-field imagery) via the tile proxy; polygon fills are hidden, outlines stay. Falls back to polygon fill when no imagery (mock / cloudy date).
- **Other layers** — per-field colored polygons from `/api/map/layers` values. Color ramps are client-side in `lib/geojson.ts` (`layerColor`); legend metadata in `lib/layer-meta.ts`.

### Zustand Stores

- **`lib/store.ts`** — global UI state (selected field, date, map layer, selected sensor). No persistence.
- **`lib/fields-store.ts`** — field CRUD with `zustand/persist` (localStorage). Uses `skipHydration` + manual `rehydrate()` to avoid SSR/client mismatch.
- **`lib/sensors-store.ts`** — sensor CRUD with `zustand/persist` (localStorage), same `skipHydration` + `rehydrate()` pattern. Backs the `/sensors` grid.

### Server vs Client Components

- **Server (default):** pages, layout, `FieldGrid`, `Card`, `MetricTile`, `Skeleton`, `Button`
- **Client (`"use client"`):** shell, modals, status pills, map, sensor, timeline, store consumers
- `components/ui/icon.tsx` isolates Phosphor's React Context so icons work in Server Components

## Conventions

- **`cn()`** for all conditional class composition (`lib/utils/cn.ts`)
- **`satisfies`** keyword for type-safe object literals
- **Async params:** `params: Promise<{ id: string }>` with `await context.params` (Next.js 16 pattern)
- **Polish labels:** all enum labels centralized in `lib/labels.ts`, `lang="pl"` on `<html>`
- **Skeleton-first loading:** every async component shows matching skeleton, not spinners
- **Tactile feedback:** buttons use `active:scale-[0.98]`
- **No em-dashes in UI text** (DESIGN.md Section 9.G)
- **Paired status colors:** fg + bg tint per status, never large fills

## File Map

```
app/
  (dashboard)/          — route group, wraps in DashboardShell
    page.tsx            — / (dashboard home, FieldGrid)
    map/page.tsx        — /map (Mapbox + toolbar + device panel)
    sensor/[id]/page.tsx — /sensor/:id (image browser + notes)
    sensors/            — /sensors (all sensors card grid + CRUD + per-card debug)
    crop-rotation/      — /crop-rotation
    ai-assessment/      — /ai-assessment (heuristic AI)
    field-management/   — /field-management (CRUD)
    members/            — /members
  api/fields/[id]/metrics/route.ts — BFF endpoint (per-field metrics)
  api/map/layers/route.ts         — BFF endpoint (all fields × all layers)
  api/tiles/ndvi/[z]/[x]/[y]/route.ts — Sentinel-2 NDVI tile proxy (token-injecting)

components/
  shell/   — DashboardShell, Sidebar, TopBar, PagePlaceholder
  ui/      — Card, StatusPill, MetricTile, Button, Skeleton, Modal, TextInput, SelectInput
  fields/  — FieldCard, FieldGrid, FieldEditorModal, FieldDrawMap
  map/     — MapView, DevicePanel, DateSelector, LayerFilter, LayerLegend
  sensor/  — ImageBrowser, TimelineSlider, NotesPanel
  sensors/ — SensorsView, SensorCard, SensorEditorModal

lib/
  types.ts         — domain model types
  store.ts         — global UI Zustand store
  fields-store.ts  — field CRUD Zustand store (persisted)
  sensors-store.ts — sensor CRUD Zustand store (persisted)
  labels.ts        — Polish enum labels
  metrics.ts       — per-field BFF aggregation logic
  map-values.ts    — map BFF aggregation logic (server-only)
  gdd.ts           — growing-degree-days computation (shared)
  geojson.ts       — GeoJSON builders + per-layer color ramps + pickLayerValues (client-safe)
  layer-meta.ts    — per-layer legend metadata (ranges, units, source)
  geometry.ts      — spherical polygon area/centroid (no turf)
  mapbox.ts        — token reader from env
  navigation.ts    — NAV_ITEMS array
  mock/data.ts     — deterministic mock dataset
  providers/       — provider interfaces + mock/live implementations + env-gated registry
  utils/cn.ts      — clsx + tailwind-merge
```

## Common Tasks

**Add a new module/page:** create `app/(dashboard)/your-page/page.tsx`, add entry to `lib/navigation.ts` with Phosphor icon, import in `Sidebar.tsx`.

**Add/edit/delete persisted domain entities:** each editable domain has a persisted Zustand store (`lib/fields-store.ts`, `lib/sensors-store.ts`) using the `skipHydration` + client `rehydrate()` pattern to stay SSR-safe. Render the static seed until `hydrated` flips true, then swap to the store list. Editor modals (`FieldEditorModal`, `SensorEditorModal`) remount their form per target via `key` so state never needs syncing from props.

**Swap a provider to live API:** providers are env-gated in `lib/providers/registry.ts` - setting the right env var flips mock → live with no code or UI change. Weather uses Open-Meteo (keyless, live by default; `OPEN_METEO_BASE_URL=mock` to opt out); satellite uses Sentinel-2 when `SENTINEL_CLIENT_ID` + `SENTINEL_SECRET` are set. To add a brand-new source, implement the interface in `lib/providers/types.ts` and add the env gate in `registry.ts`.

**Add a UI component:** place in `components/ui/`, use `cn()` for classes, follow existing patterns (see `Card.tsx` or `StatusPill.tsx`). Mark interactive components with `"use client"`.

**Add enum labels:** add entries to the relevant `Record` in `lib/labels.ts`. All UI text uses these centralized labels.

## Status

MVP complete. All modules functional with mock-first data. Ready for: real auth, live API provider swap, polygon drawing, note persistence, ML assessment model.
