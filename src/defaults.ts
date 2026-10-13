import type { Settings, Shortcut } from "./types";

/**
 * Raccourcis par défaut, pensés pour une utilisation sous Linux.
 *
 * Volontairement très courts : quatre grosses tuiles seulement. Les commandes
 * restent modifiables depuis l'écran « Paramètres ».
 */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    id: "navigateur",
    label: "Internet",
    kind: "app",
    target: "xdg-open",
    args: ["https://www.google.fr"],
    emoji: "🌐",
    color: "#2f6fed",
  },
  {
    id: "courrier",
    label: "Mes mails",
    kind: "app",
    target: "thunderbird",
    emoji: "✉️",
    color: "#c0392b",
  },
  {
    // Action interne : ouvre l'écran de numérisation (aperçu, enregistrement).
    // (L'impression sera ajoutée plus tard.)
    id: "imprimante",
    label: "Imprimante",
    kind: "action",
    target: "scan",
    emoji: "🖨️",
    color: "#7f8c8d",
  },
  {
    // Action interne : ouvre l'écran des paramètres.
    id: "parametres",
    label: "Paramètres",
    kind: "action",
    target: "settings",
    emoji: "⚙️",
    color: "#2c3e50",
  },
];

export const DEFAULT_SETTINGS: Settings = {
  fontScale: 1.25,
  theme: "clair",
  volume: 60,
  city: "Paris",
  kiosk: false,
  majAuto: true,
  shortcuts: DEFAULT_SHORTCUTS,
};
