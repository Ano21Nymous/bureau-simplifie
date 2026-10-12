/**
 * Météo via Open-Meteo : aucune clé d'API, aucune donnée personnelle envoyée.
 * Deux appels : géocodage de la ville, puis météo courante.
 */

export interface WeatherResult {
  temperature: number;
  emoji: string;
  label: string;
  place: string;
  lat: number;
  lon: number;
}

/** Traduction des codes météo WMO en émoji + libellé français. */
function describe(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Ensoleillé" };
  if (code <= 2) return { emoji: "🌤️", label: "Peu nuageux" };
  if (code === 3) return { emoji: "☁️", label: "Nuageux" };
  if (code <= 48) return { emoji: "🌫️", label: "Brouillard" };
  if (code <= 57) return { emoji: "🌦️", label: "Bruine" };
  if (code <= 67) return { emoji: "🌧️", label: "Pluie" };
  if (code <= 77) return { emoji: "🌨️", label: "Neige" };
  if (code <= 82) return { emoji: "🌧️", label: "Averses" };
  if (code <= 86) return { emoji: "🌨️", label: "Averses de neige" };
  return { emoji: "⛈️", label: "Orage" };
}

async function geocode(
  city: string,
  signal: AbortSignal,
): Promise<{ lat: number; lon: number; place: string }> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "fr");
  url.searchParams.set("format", "json");

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Géocodage impossible (${res.status})`);
  const data = (await res.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string }>;
  };
  const first = data.results?.[0];
  if (!first) throw new Error(`Ville introuvable : ${city}`);
  return { lat: first.latitude, lon: first.longitude, place: first.name };
}

export async function fetchWeather(
  city: string,
  coords: { lat?: number; lon?: number },
  signal: AbortSignal,
): Promise<WeatherResult> {
  const geo =
    coords.lat !== undefined && coords.lon !== undefined
      ? { lat: coords.lat, lon: coords.lon, place: city }
      : await geocode(city, signal);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(geo.lat));
  url.searchParams.set("longitude", String(geo.lon));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Météo indisponible (${res.status})`);
  const data = (await res.json()) as {
    current?: { temperature_2m: number; weather_code: number };
  };
  const current = data.current;
  if (!current) throw new Error("Réponse météo vide");

  const { emoji, label } = describe(current.weather_code);
  return {
    temperature: Math.round(current.temperature_2m),
    emoji,
    label,
    place: geo.place,
    lat: geo.lat,
    lon: geo.lon,
  };
}
