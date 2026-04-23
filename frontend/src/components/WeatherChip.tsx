import type { Starter } from "../api";

type Weather = NonNullable<Starter["weather"]>;

function emojiFor(w: Weather): string {
  if (w.indoor) return "🏟️";
  const c = w.condition.toLowerCase();
  if (c.includes("thunder")) return "⛈️";
  if (c.includes("snow")) return "🌨️";
  if (c.includes("rain") || c.includes("showers") || c.includes("drizzle")) return "🌧️";
  if (c.includes("fog")) return "🌫️";
  if (c.includes("cloudy") && !c.includes("mostly clear")) return "☁️";
  if (c.includes("partly")) return "⛅";
  return "☀️";
}

function labelFor(w: Weather): string {
  if (w.indoor) return "Indoors";
  // Elevate notable conditions
  if (w.wet && !/rain|showers|drizzle|thunder/i.test(w.condition)) return "Rainy";
  if (w.windy && /clear|partly|mostly|cloudy/i.test(w.condition)) return "Windy";
  return w.condition;
}

export default function WeatherChip({
  weather,
  size = "sm",
}: {
  weather: Starter["weather"];
  size?: "sm" | "md";
}) {
  if (!weather) return null;
  const label = labelFor(weather);
  const e = emojiFor(weather);
  const temp = weather.temp_f !== null ? `${weather.temp_f}°F` : null;
  const textCls = size === "md" ? "text-sm" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-1 text-field-mute ${textCls}`}>
      <span>{e}</span>
      <span className="text-field-chalk/80">{label}</span>
      {!weather.indoor && temp && <span className="tabular-nums">{temp}</span>}
      {!weather.indoor && weather.windy && weather.wind_mph !== null && (
        <span className="text-field-chalk/60">· {weather.wind_mph}mph</span>
      )}
    </span>
  );
}
