import { WeatherView } from "@/components/weather/WeatherView";

/**
 * /pogoda - field-scoped weather forecast.
 *
 * The page itself is a thin server wrapper; WeatherView is the client body that
 * owns the field selector + BFF fetch (provider credentials stay server-only).
 */
export default function PogodaPage() {
  return <WeatherView />;
}
