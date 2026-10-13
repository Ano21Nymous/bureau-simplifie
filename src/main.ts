import { DEFAULT_SETTINGS } from "./defaults";
import { WEATHER_ICONS } from "./icons";
import { isTauri, kioskOverride, loadSettings, quitApp, saveSettings, setKiosk, setVolume } from "./ipc";
import type { Settings, Shortcut } from "./types";
import { runShortcut } from "./modules/actions";
import { startClock } from "./modules/clock";
import { renderGrid } from "./modules/launcher";
import { openScanPanel } from "./modules/scan-panel";
import { openSettingsPanel } from "./modules/settings-panel";
import { toast } from "./modules/toast";
import { fetchWeather } from "./modules/weather";

const WEATHER_REFRESH_MS = 30 * 60 * 1000;

let settings: Settings = { ...DEFAULT_SETTINGS };
let weatherAbort: AbortController | null = null;
let persistTimer: number | undefined;

function setText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function applyAppearance(): void {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty("--font-scale", String(settings.fontScale));
}

/** Enregistre les réglages, avec un léger différé pour éviter les écritures en rafale. */
function persist(): void {
  if (persistTimer !== undefined) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void saveSettings(settings).catch((error: unknown) => {
      console.error("Sauvegarde des réglages impossible", error);
    });
  }, 400);
}

/**
 * Point d'entrée d'une tuile.
 *
 * Les actions internes au bureau (par exemple « Paramètres ») sont traitées
 * ici, car elles ont besoin de l'état de l'application ; tout le reste
 * (application, site internet, action système) part vers runShortcut.
 */
function handleShortcut(shortcut: Shortcut): void {
  if (shortcut.kind === "action" && shortcut.target === "settings") {
    openSettings();
    return;
  }
  if (shortcut.kind === "action" && shortcut.target === "scan") {
    openScanPanel();
    return;
  }
  void runShortcut(shortcut);
}

function renderAll(): void {
  renderGrid(settings.shortcuts, handleShortcut);
}

function openSettings(): void {
  openSettingsPanel({
    settings,
    onChange: (next) => {
      settings = next;
      applyAppearance();
      renderAll();
      persist();
    },
    onRefreshWeather: () => {
      void refreshWeather();
    },
  });
}

/** Affiche (ou masque) l'icône météo du bandeau supérieur. */
function setWeatherIcon(state: string | null): void {
  const icon = document.getElementById("weather-icon");
  if (!(icon instanceof HTMLImageElement)) return;

  const src = state ? WEATHER_ICONS[state] : undefined;
  if (!src) {
    icon.hidden = true;
    return;
  }
  icon.src = src;
  icon.hidden = false;
}

async function refreshWeather(): Promise<void> {
  weatherAbort?.abort();
  weatherAbort = new AbortController();

  try {
    const result = await fetchWeather(
      settings.city,
      { lat: settings.lat, lon: settings.lon },
      weatherAbort.signal,
    );

    setWeatherIcon(result.state);
    setText("weather-temp", `${result.temperature}°`);
    setText("weather-place", `${result.place} · ${result.label}`);

    if (settings.lat !== result.lat || settings.lon !== result.lon) {
      settings = { ...settings, lat: result.lat, lon: result.lon };
      persist();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    setWeatherIcon(null);
    setText("weather-temp", "--°");
    setText("weather-place", "Météo indisponible");
  }
}

async function exitKiosk(): Promise<void> {
  settings = { ...settings, kiosk: false };
  persist();
  await setKiosk(false);
  toast("Mode verrouillé désactivé.");
  openSettings();
}

/** Cinq clics rapides sur l'heure permettent de sortir du mode kiosque. */
function setupKioskExit(): void {
  const clock = document.querySelector(".clock");
  if (!clock) return;

  const taps: number[] = [];
  clock.addEventListener("click", () => {
    if (!settings.kiosk) return;
    const now = Date.now();
    taps.push(now);
    while (taps.length > 0 && now - taps[0] > 2500) taps.shift();
    if (taps.length >= 5) {
      taps.length = 0;
      void exitKiosk();
    }
  });
}

function setupShortcuts(): void {
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "q") {
      event.preventDefault();
      if (window.confirm("Fermer le bureau simplifié ?")) void quitApp();
    }
  });

  // Pas de menu contextuel : l'interface doit rester toute simple.
  document.addEventListener("contextmenu", (event) => {
    if (settings.kiosk) event.preventDefault();
  });
}

/** Masque le pointeur après quelques secondes d'inactivité : illusion d'un écran dédié. */
function setupCursorHiding(): void {
  let timer: number | undefined;

  const show = (): void => {
    document.documentElement.classList.remove("cursor-hidden");
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      document.documentElement.classList.add("cursor-hidden");
    }, 4000);
  };

  window.addEventListener("mousemove", show, { passive: true });
  window.addEventListener("mousedown", show, { passive: true });
  window.addEventListener("touchstart", show, { passive: true });
  show();
}

async function init(): Promise<void> {
  const stored = await loadSettings();
  settings = {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    shortcuts: stored?.shortcuts ?? DEFAULT_SETTINGS.shortcuts,
  };

  // Sur une machine dédiée, la session force le mode verrouillé.
  if (await kioskOverride()) settings.kiosk = true;

  applyAppearance();
  renderAll();
  startClock();
  setupKioskExit();
  setupShortcuts();
  setupCursorHiding();

  if (settings.kiosk) void setKiosk(true);
  void setVolume(settings.volume);
  void refreshWeather();
  window.setInterval(() => void refreshWeather(), WEATHER_REFRESH_MS);

  if (!isTauri) {
    console.info(
      "Mode navigateur : les raccourcis système sont simulés. Lancez `npm run desktop:dev` pour l'app complète.",
    );
  }
}

void init();
