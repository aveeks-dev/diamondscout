import type { Starter } from "../api";

type Weather = NonNullable<Starter["weather"]>;

function label(w: Weather): string {
  if (w.indoor) return "Indoors";
  if (w.wet && !/rain|showers|drizzle|thunder/i.test(w.condition)) return "Rainy";
  if (w.windy && /clear|partly|mostly|cloudy/i.test(w.condition)) return "Windy";
  return w.condition;
}

/**
 * Text-first weather chip. Uses typography and a small colored dot for
 * notable conditions (windy, wet) instead of emoji.
 */
export default function WeatherChip({
  weather,
  size = "sm",
}: {
  weather: Starter["weather"];
  size?: "sm" | "md";
}) {
  if (!weather) return null;
  const text = size === "md" ? "text-sm" : "text-xs";
  const notable = !weather.indoor && (weather.windy || weather.wet);
  return (
    <span className={`inline-flex items-center gap-2 text-ink-dim ${text}`}>
      {notable && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: weather.wet ? "#7d95b5" : "#c89c4c" }}
          aria-hidden
        />
      )}
      <span className="text-ink-text/90">{label(weather)}</span>
      {!weather.indoor && weather.temp_f !== null && (
        <span className="num text-ink-dim">{weather.temp_f}°</span>
      )}
      {!weather.indoor && weather.windy && weather.wind_mph !== null && (
        <span className="num text-ink-faint">{weather.wind_mph} mph</span>
      )}
    </span>
  );
}
