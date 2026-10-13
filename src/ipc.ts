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

/** Règle la luminosité de l'écran (0-100). */
export async function setBrightness(level: number): Promise<void> {
  if (isTauri) {
    await invoke("set_brightness", { level: Math.round(level) });
    return;
  }
  console.info("[setBrightness hors Tauri]", level);
}

/**
 * Lit la luminosité actuelle (0-100).
 * Renvoie `null` quand l'écran n'a pas de rétroéclairage réglable
 * (moniteur externe, par exemple) : le curseur est alors masqué.
 */
export async function readBrightness(): Promise<number | null> {
  if (isTauri) {
    return (await invoke("read_brightness")) as number | null;
  }
  return 80; // valeur fictive, pour mettre au point l'interface au navigateur
}

/** Résultat d'une numérisation : aperçu affichable et fichier temporaire. */
export interface ScanResult {
  /** Image affichable directement (data:image/…;base64,…). */
  dataUrl: string;
  /** Chemin du fichier temporaire, à passer à saveScan(). */
  path: string;
}

/** Image de remplacement, affichée dans le navigateur pour mettre au point l'écran. */
const FAKE_SCAN =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
      <rect width="600" height="800" fill="#ffffff"/>
      <rect x="60" y="60" width="480" height="30" fill="#d4d4d4"/>
      <rect x="60" y="120" width="480" height="12" fill="#e8e8e8"/>
      <rect x="60" y="150" width="440" height="12" fill="#e8e8e8"/>
      <rect x="60" y="180" width="470" height="12" fill="#e8e8e8"/>
      <text x="60" y="300" font-family="sans-serif" font-size="22" fill="#555761">Aperçu simulé (mode navigateur)</text>
      <rect x="60" y="340" width="480" height="12" fill="#e8e8e8"/>
      <rect x="60" y="370" width="430" height="12" fill="#e8e8e8"/>
      <rect x="60" y="400" width="460" height="12" fill="#e8e8e8"/>
    </svg>`,
  );

/** Numérise un document et renvoie un aperçu affichable. */
export async function scanDocument(): Promise<ScanResult> {
  if (isTauri) {
    return (await invoke("scan_document")) as ScanResult;
  }
  // Hors Tauri, on simule un scanner pour pouvoir tester l'interface.
  await new Promise((resolve) => setTimeout(resolve, 900));
  return { dataUrl: FAKE_SCAN, path: "numerisation-simulee.jpg" };
}

/** Enregistre le document scanné dans le dossier Images de l'utilisateur. */
export async function saveScan(path: string): Promise<string> {
  if (isTauri) {
    return (await invoke("save_scan", { path })) as string;
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
  return "~/Images/Numérisations/numérisation.jpg";
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

/** Vrai quand la session impose le mode kiosque (machine dédiée). */
export async function kioskOverride(): Promise<boolean> {
  if (isTauri) {
    return (await invoke("kiosk_override")) as boolean;
  }
  return false;
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
