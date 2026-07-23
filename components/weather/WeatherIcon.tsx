"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/icon";
import type { IconComponentProps } from "@/components/ui/icon";
import type { WeatherCode } from "@/lib/types";

/**
 * Maps a WMO weather code to a Phosphor glyph. Pure visual; the code's label +
 * status (colour) come from lib/weather-codes.ts so status is never conveyed
 * by colour alone (DESIGN.md §Accessibility).
 *
 * Client component because Phosphor uses React Context (see ui/icon.tsx).
 */
function iconForCode(code: WeatherCode) {
  // Thunderstorm (95-99)
  if (code >= 95) return CloudLightning;
  // Snow / freezing (71-77, 85-86)
  if (code === 71 || code === 73 || code === 75 || code === 77 || code >= 85) {
    return CloudSnow;
  }
  // Drizzle / rain / showers (51-67, 80-82)
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  // Fog (45, 48)
  if (code === 45 || code === 48) return CloudFog;
  // Clear (0-1) -> Sun; partly cloudy (2) -> CloudSun; overcast (3) -> Cloud.
  if (code <= 1) return Sun;
  if (code === 2) return CloudSun;
  return Cloud; // overcast + any unmapped code
}

export function WeatherIcon({
  code,
  size = 24,
  className,
}: { code: WeatherCode } & Omit<IconComponentProps, "icon">) {
  return <Icon icon={iconForCode(code)} size={size} className={className} />;
}
