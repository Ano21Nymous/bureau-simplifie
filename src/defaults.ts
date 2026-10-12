import type { Settings, Shortcut } from "./types";

/**
 * Raccourcis par défaut, pensés pour une utilisation sous Linux.
 * Les commandes sont celles des environnements de bureau courants ;
 * elles restent modifiables depuis l'écran « Réglages ».
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
    id: "photos",
    label: "Mes photos",
    kind: "app",
    target: "xdg-open",
    args: ["~/Images"],
    emoji: "🖼️",
    color: "#8e44ad",
  },
  {
    id: "musique",
    label: "Ma musique",
    kind: "app",
    target: "rhythmbox",
    emoji: "🎵",
    color: "#16a085",
  },
  {
    id: "calcul",
    label: "Calculatrice",
    kind: "app",
    target: "gnome-calculator",
    emoji: "🔢",
    color: "#2c3e50",
  },
  {
    id: "fichiers",
    label: "Mes fichiers",
    kind: "app",
    target: "nautilus",
    emoji: "📁",
    color: "#d68910",
  },
  {
    id: "actu",
    label: "Les infos",
    kind: "url",
    target: "https://www.francetvinfo.fr",
    emoji: "📰",
    color: "#34495e",
  },
  {
    id: "videos",
    label: "Vidéos",
    kind: "url",
    target: "https://www.youtube.com",
    emoji: "📺",
    color: "#c0392b",
  },
];

export const DEFAULT_SETTINGS: Settings = {
  fontScale: 1.25,
  theme: "clair",
  volume: 60,
  city: "Paris",
  kiosk: false,
  shortcuts: DEFAULT_SHORTCUTS,
};
