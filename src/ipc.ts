import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "./types";

/**
 * Couche d'abstraction entre l'interface et le système.
 *
 * Deux modes :
 *  - Dans l'app Tauri  -> les commandes Rust sont appelées via `invoke`.
 *  - Dans un navigateur -> repli (localStorage / window.open) pour pouvoir
 *    développer et tester toute l'interface avec `npm run dev`, sans rien
 *    compiler en natif.
 */
export const isTauri =
  typeof window !== "undefined" &&
  Object.prototype.hasOwnProperty.call(window, "__TAURI_INTERNALS__");

/** Lance une application du système (ex. `firefox`, `xdg-open`). */
export async function launchApp(program: string, args: string[] = []): Promise<void> {
  if (isTauri) {
    await invoke("launch_app", { program, args });
    return;
  }
  window.open(program, "_blank", "noopener");
}

/** Ouvre une URL dans le navigateur par défaut du système. */
export async function openUrl(url: string): Promise<void> {
  if (isTauri) {
    await invoke("open_url", { url });
    return;
  }
  window.open(url, "_blank", "noopener");
}

/** Exécute une commande système utilitaire (impression, numérisation…). */
export async function systemRun(command: string, args: string[] = []): Promise<void> {
  if (isTauri) {
    await invoke("system_run", { command, args });
    return;
  }
  console.info("[systemRun hors Tauri]", command, args);
}

/** Règle le volume système (0-100). */
export async function setVolume(level: number): Promise<void> {
  if (isTauri) {
    await invoke("set_volume", { level: Math.round(level) });
    return;
  }
  console.info("[setVolume hors Tauri]", level);
}

/** Active/désactive le mode kiosque (plein écran verrouillé). */
export async function setKiosk(enabled: boolean): Promise<void> {
  if (isTauri) {
    await invoke("set_kiosk", { enabled });
    return;
  }
  if (enabled && document.documentElement.requestFullscreen) {
    await document.documentElement.requestFullscreen().catch(() => undefined);
  } else if (!enabled && document.fullscreenElement) {
    await document.exitFullscreen().catch(() => undefined);
  }
}

/** Quitte l'application. */
export async function quitApp(): Promise<void> {
  if (isTauri) {
    await invoke("quit_app");
    return;
  }
  window.close();
}

const STORAGE_KEY = "bureau-simplifie.settings";

/** Charge les réglages enregistrés (null si aucun). */
export async function loadSettings(): Promise<Partial<Settings> | null> {
  if (isTauri) {
    return (await invoke("load_settings")) as Partial<Settings> | null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Partial<Settings>) : null;
}

/** Sauvegarde les réglages. */
export async function saveSettings(settings: Settings): Promise<void> {
  if (isTauri) {
    await invoke("save_settings", { settings });
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
