/**
 * Mock data layer. Deterministic and realistic - no fake-perfect numbers.
 *
 * Coordinates are real farmland near Rawicz, PL (cowpolupiszczy region).
 * Time series span the last ~6 weeks so the timeline slider has content.
 *
 * In production this file is replaced by real provider responses; the shape
 * (see lib/types.ts) stays identical, so the rest of the app is unaffected.
 */
import type {
  Field,
  IsoDate,
  NdviSample,
  Note,
  Sensor,
  SensorImage,
  SensorReading,
  WeatherDay,
  WeatherDayForecast,
  WeatherHour,
} from "@/lib/types";

/** Reference "today" - pinned so the mock dataset is stable across runs. */
export const TODAY: IsoDate = "2026-06-15";

const DAY_MS = 86_400_000;

/** Build a sorted list of ISO dates ending at `end`, stepping by `stepDays`. */
export function dateRange(
  end: IsoDate,
  count: number,
  stepDays: number,
): IsoDate[] {
  const endMs = Date.parse(end);
  const out: IsoDate[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(toIsoDate(endMs - i * stepDays * DAY_MS));
  }
  return out;
}

export function toIsoDate(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return toIsoDate(Date.parse(iso) + days * DAY_MS);
}

/** Deterministic pseudo-random in [0,1) from a string seed. Stable across runs. */
function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Normalize to [0,1)
  return ((h >>> 0) % 10000) / 10000;
}

/** Round to N decimals. */
function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// --- Fields -----------------------------------------------------------------

export const fields: Field[] = [
  {
    id: "f-rawicz-1",
    name: "Łąki Rawickie",
    crop: {
      crop: "pszenica_ozima",
      sowingDate: "2025-10-12",
      expectedHarvestDate: "2026-07-25",
      baseTempC: 0,
    },
    areaHa: 24.6,
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [16.854, 51.612],
          [16.881, 51.612],
          [16.881, 51.598],
          [16.854, 51.598],
          [16.854, 51.612],
        ],
      ],
    },
    centroid: [16.8675, 51.605],
    status: "normal",
  },
  {
    id: "f-konarzewo",
    name: "Konarzewo Górne",
    crop: {
      crop: "rzepak",
      sowingDate: "2025-08-24",
      expectedHarvestDate: "2026-07-10",
      baseTempC: 5,
    },
    areaHa: 18.3,
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [16.912, 51.605],
          [16.934, 51.605],
          [16.934, 51.592],
          [16.912, 51.592],
          [16.912, 51.605],
        ],
      ],
    },
    centroid: [16.923, 51.5985],
    status: "warning",
  },
  {
    id: "f-dabrowa",
    name: "Dąbrowa Zachód",
    crop: {
      crop: "kukurydza",
      sowingDate: "2026-04-18",
      expectedHarvestDate: "2026-10-05",
      baseTempC: 10,
    },
    areaHa: 31.2,
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [16.842, 51.596],
          [16.872, 51.596],
          [16.872, 51.581],
          [16.842, 51.581],
          [16.842, 51.596],
        ],
      ],
    },
    centroid: [16.857, 51.5885],
    status: "urgent",
  },
];

// --- Sensors ----------------------------------------------------------------

export const sensors: Sensor[] = [
  {
    id: "s-kam-1",
    fieldId: "f-rawicz-1",
    name: "Kamera RGB-IR 01",
    kind: "kamera_rgb",
    position: { type: "Point", coordinates: [16.869, 51.604] },
    status: "online",
    batteryPct: 87,
    lastSeenAt: TODAY,
  },
  {
    id: "s-gleba-1",
    fieldId: "f-rawicz-1",
    name: "Sonda glebowa A",
    kind: "glebowy",
    position: { type: "Point", coordinates: [16.862, 51.601] },
    status: "online",
    batteryPct: 64,
    lastSeenAt: TODAY,
  },
  {
    id: "s-meteo-1",
    fieldId: "f-rawicz-1",
    name: "Stacja meteo 1",
    kind: "stacja_meteo",
    position: { type: "Point", coordinates: [16.876, 51.608] },
    status: "warning",
    batteryPct: 41,
    lastSeenAt: "2026-06-14",
  },
  {
    id: "s-kam-2",
    fieldId: "f-konarzewo",
    name: "Kamera RGB-IR 02",
    kind: "kamera_rgb",
    position: { type: "Point", coordinates: [16.921, 51.599] },
    status: "online",
    batteryPct: 92,
    lastSeenAt: TODAY,
  },
  {
    id: "s-gleba-2",
    fieldId: "f-konarzewo",
    name: "Sonda glebowa B",
    kind: "glebowy",
    position: { type: "Point", coordinates: [16.928, 51.596] },
    status: "offline",
    batteryPct: 8,
    lastSeenAt: "2026-06-11",
  },
  {
    id: "s-kam-3",
    fieldId: "f-dabrowa",
    name: "Kamera RGB-IR 03",
    kind: "kamera_rgb",
    position: { type: "Point", coordinates: [16.854, 51.589] },
    status: "online",
    batteryPct: 78,
    lastSeenAt: TODAY,
  },
  {
    id: "s-gleba-3",
    fieldId: "f-dabrowa",
    name: "Sonda glebowa C",
    kind: "glebowy",
    position: { type: "Point", coordinates: [16.861, 51.585] },
    status: "warning",
    batteryPct: 33,
    lastSeenAt: "2026-06-13",
  },
];

// --- NDVI time series (satellite cadence, ~5 days) --------------------------

const NDVI_BASELINE: Record<string, number> = {
  "f-rawicz-1": 0.72, // healthy wheat heading
  "f-konarzewo": 0.58, // rapeseed senescing
  "f-dabrowa": 0.34, // maize early growth - concerning
};

export const ndviSamples: NdviSample[] = fields.flatMap((field) => {
  const dates = dateRange(TODAY, 9, 5);
  const baseline = NDVI_BASELINE[field.id] ?? 0.6;
  return dates.map((date, i) => {
    const drift = (seeded(`${field.id}-ndvi-${i}`) - 0.5) * 0.08;
    // Slight downward trend for rapeseed (senescence), upward for maize (growth).
    let trend = 0;
    if (field.crop.crop === "kukurydza") trend = i * 0.012;
    if (field.crop.crop === "rzepak") trend = -i * 0.018;
    return {
      fieldId: field.id,
      date,
      value: round(clamp(baseline + drift + trend, 0, 0.92), 3),
    };
  });
});

// --- Weather (daily) --------------------------------------------------------

export const weatherDays: WeatherDay[] = fields.flatMap((field) => {
  const dates = dateRange(TODAY, 42, 1);
  let gddAccum = field.crop.crop === "pszenica_ozima" ? 1840 : 980;
  return dates.map((date, i) => {
    const seed = seeded(`${field.id}-wx-${date}`);
    const tempMaxC = round(20 + seed * 9, 1); // 20-29
    const tempMinC = round(9 + seed * 6, 1); // 9-15
    const tempAvgC = round((tempMaxC + tempMinC) / 2, 1);
    const dailyGdd = Math.max(
      0,
      ((tempMaxC + tempMinC) / 2 - field.crop.baseTempC) | 0,
    );
    gddAccum += dailyGdd;
    return {
      fieldId: field.id,
      date,
      tempAvgC,
      tempMinC,
      tempMaxC,
      gddCumulative: gddAccum,
      dewHours: Math.round(seed * 7),
      humidityPct: Math.round(55 + seed * 35),
    };
  });
});

// --- Forecast (forward-looking: 48h hourly + 7d daily) ----------------------
//
// Distinct from the historical weatherDays above: this drives the /pogoda page.
// Deterministic and anchored to TODAY so the forecast is stable across runs,
// just like the rest of the mock dataset. WMO weather_code values mirror the
// real Open-Meteo codes (see lib/weather-codes.ts).

const HOUR_MS = 3_600_000;

/** Add N hours to an ISO date, returning a local hour stamp "YYYY-MM-DDTHH". */
function addHoursIso(date: IsoDate, hours: number): string {
  // Build from the date at local midnight (no Z) so the stamp stays field-local.
  return new Date(Date.parse(`${date}T00:00:00`) + hours * HOUR_MS)
    .toISOString()
    .slice(0, 13);
}

/** Pick a deterministic WMO code biased by a rain seed: dry / partly cloudy / rain. */
function pickMockWeatherCode(seed: number): number {
  if (seed > 0.82) return 95; // burza (thunderstorm)
  if (seed > 0.6) return 61; // deszcz (slight rain)
  if (seed > 0.42) return 3; // zachmurzenie (overcast)
  if (seed > 0.2) return 2; // częściowe zachmurzenie
  return 0; // bezchmurnie (clear)
}

/**
 * Deterministic 48-hour forecast for a field. Temperature follows a diurnal
 * curve (min ~05:00, max ~15:00) around the field's seasonal baseline; rain
 * probability and amount vary per hour from a seed.
 */
export function hourlyForecast(fieldId: string): WeatherHour[] {
  const field = fields.find((f) => f.id === fieldId);
  if (!field) return [];
  const baseline =
    field.crop.crop === "pszenica_ozima"
      ? 21
      : field.crop.crop === "rzepak"
        ? 20
        : 19;
  const out: WeatherHour[] = [];
  for (let h = 0; h < 48; h++) {
    const stamp = addHoursIso(TODAY, h);
    const hour = Number(stamp.slice(11, 13));
    // Cosine diurnal curve: peak ~15:00, trough ~05:00, amplitude 6°C.
    const diurnal = Math.cos(((hour - 15) / 24) * 2 * Math.PI) * -6;
    const seed = seeded(`${fieldId}-hfx-${stamp}`);
    const drift = (seed - 0.5) * 3;
    const tempC = round(baseline + diurnal + drift, 1);
    const precipProbPct = Math.round(clamp(seed * 130 - 30, 0, 95));
    const precipMm =
      precipProbPct > 40 ? round(clamp(seed * 4, 0, 6), 1) : 0;
    out.push({
      fieldId,
      time: stamp,
      tempC,
      precipProbPct,
      precipMm,
      weatherCode: pickMockWeatherCode(seed),
    });
  }
  return out;
}

/** Deterministic 7-day forecast for a field. */
export function dailyForecast(fieldId: string): WeatherDayForecast[] {
  const field = fields.find((f) => f.id === fieldId);
  if (!field) return [];
  const baseline =
    field.crop.crop === "pszenica_ozima"
      ? 22
      : field.crop.crop === "rzepak"
        ? 21
        : 20;
  const dates = dateRange(addDays(TODAY, 6), 7, 1);
  return dates.map((date) => {
    const seed = seeded(`${fieldId}-dfx-${date}`);
    const tempMaxC = round(baseline + seed * 7, 1); // 20-29
    const tempMinC = round(baseline - 6 + seed * 4, 1); // ~13-18
    const tempAvgC = round((tempMaxC + tempMinC) / 2, 1);
    const precipProbPct = Math.round(clamp(seed * 120 - 20, 0, 90));
    const precipMm =
      precipProbPct > 35 ? round(clamp(seed * 8, 0, 12), 1) : 0;
    return {
      fieldId,
      date,
      tempMaxC,
      tempMinC,
      tempAvgC,
      precipProbPct,
      precipMm,
      weatherCode: pickMockWeatherCode(seed),
      windMaxKmh: Math.round(8 + seed * 22), // 8-30
      humidityPct: Math.round(50 + seed * 40), // 50-90
    };
  });
}

// --- Soil sensor readings (hourly-ish aggregated to daily) ------------------

export const sensorReadings: SensorReading[] = sensors
  .filter((s) => s.kind === "glebowy")
  .flatMap((sensor) => {
    const dates = dateRange(TODAY, 30, 1);
    return dates.map((date, i) => {
      const seed = seeded(`${sensor.id}-soil-${date}`);
      const dryness = i * 0.4; // gradual drying trend
      return {
        sensorId: sensor.id,
        date,
        soilMoisturePct: Math.round(clamp(42 - dryness + seed * 12, 8, 60)),
        soilTempC: round(13 + i * 0.18 + seed * 2, 1),
        ecDsM: round(0.8 + seed * 0.6, 2),
      };
    });
  });

// --- Imagery (camera sensors, ~daily across 6 weeks) ------------------------

export const sensorImages: SensorImage[] = sensors
  .filter((s) => s.kind === "kamera_rgb")
  .flatMap((sensor) => {
    const dates = dateRange(TODAY, 18, 2);
    const channels = ["rgb", "ir", "ndvi"] as const;
    return dates.flatMap((date) =>
      channels.map((channel) => ({
        id: `${sensor.id}-${date}-${channel}`,
        sensorId: sensor.id,
        date,
        channel,
        // picsum gives deterministic-ish placeholders; seed varies per capture.
        url: `https://picsum.photos/seed/${sensor.id}-${date}-${channel}/640/480`,
      })),
    );
  });

// --- Notes ------------------------------------------------------------------

export const notes: Note[] = [
  {
    id: "n-1",
    sensorId: "s-kam-1",
    date: "2026-06-10",
    author: "M. Kowalski",
    text: "Widoczne wczesne objawy septoriozy na liściu flagowym - przekazać do agronoma.",
  },
  {
    id: "n-2",
    sensorId: "s-kam-1",
    date: "2026-06-02",
    author: "A. Nowak",
    text: "Zabieg fungicydowy wykonany. Warunki sprzyjające (temp, wilgotność).",
  },
  {
    id: "n-3",
    sensorId: "s-kam-2",
    date: "2026-06-08",
    author: "M. Kowalski",
    text: "Rzepak wchodzi w dojrzewanie - planować termin zbioru.",
  },
];

// --- Helpers ----------------------------------------------------------------

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function getField(id: string): Field | undefined {
  return fields.find((f) => f.id === id);
}

export function getSensorsForField(fieldId: string): Sensor[] {
  return sensors.filter((s) => s.fieldId === fieldId);
}

export function getSensor(id: string): Sensor | undefined {
  return sensors.find((s) => s.id === id);
}
