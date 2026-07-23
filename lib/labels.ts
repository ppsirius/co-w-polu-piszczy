import type {
  CropType,
  FieldStatus,
  ImageChannel,
  MapLayer,
  SensorKind,
  SensorStatus,
} from "@/lib/types";

/** Centralized Polish labels for domain enums. */
export const cropLabel: Record<CropType, string> = {
  pszenica_ozima: "Pszenica ozima",
  rzepak: "Rzepak",
  kukurydza: "Kukurydza",
  jeczmien: "Jęczmień",
  burak_cukrowy: "Burak cukrowy",
};

export const sensorKindLabel: Record<SensorKind, string> = {
  glebowy: "Czujnik glebowy",
  kamera_rgb: "Kamera RGB/IR",
  kamera_ir: "Kamera IR",
  stacja_meteo: "Stacja meteo",
};

export const sensorStatusLabel: Record<SensorStatus, string> = {
  online: "Online",
  offline: "Offline",
  warning: "Ostrzeżenie",
};

export const channelLabel: Record<ImageChannel, string> = {
  rgb: "RGB",
  ir: "Podczerwień",
  ndvi: "NDVI",
};

export const layerLabel: Record<MapLayer, string> = {
  ndvi: "NDVI",
  temperature: "Temperatura",
  gdd: "GDD",
  moisture: "Wilgotność",
  dew: "Punkt rosy",
};

/** Polish labels for field status, mirroring the StatusPill component. */
export const fieldStatusLabel: Record<FieldStatus, string> = {
  normal: "Norma",
  warning: "Uwaga",
  urgent: "Krytyczny",
  "follow-up": "Do kontroli",
  info: "Info",
};
