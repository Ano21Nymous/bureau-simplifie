import type { Shortcut } from "../types";

/** Affiche la grille des tuiles du bureau. */
export function renderGrid(
  shortcuts: Shortcut[],
  onShortcut: (shortcut: Shortcut) => void,
): void {
  const grid = document.getElementById("grid");
  if (!grid) return;

  grid.replaceChildren();

  for (const shortcut of shortcuts) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.style.setProperty("--tile-color", shortcut.color);
    tile.setAttribute("aria-label", shortcut.label);

    const emoji = document.createElement("span");
    emoji.className = "tile__emoji";
    emoji.textContent = shortcut.emoji;

    const label = document.createElement("span");
    label.className = "tile__label";
    label.textContent = shortcut.label;

    tile.append(emoji, label);
    tile.addEventListener("click", () => onShortcut(shortcut));
    grid.append(tile);
  }
}

/** Actions toujours disponibles en bas de l'écran. */
export interface DockAction {
  id: string;
  label: string;
  emoji: string;
}

export const DOCK_ACTIONS: DockAction[] = [
  { id: "sites", label: "Mes sites", emoji: "🌐" },
  { id: "scan", label: "Numériser", emoji: "📠" },
  { id: "print", label: "Imprimer", emoji: "🖨️" },
  { id: "settings", label: "Réglages", emoji: "⚙️" },
];

/** Affiche le menu du bas. */
export function renderDock(onAction: (id: string) => void): void {
  const dock = document.getElementById("dock");
  if (!dock) return;

  dock.replaceChildren();

  for (const action of DOCK_ACTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dock__button";
    button.dataset.action = action.id;

    const emoji = document.createElement("span");
    emoji.className = "dock__emoji";
    emoji.textContent = action.emoji;

    const label = document.createElement("span");
    label.className = "dock__label";
    label.textContent = action.label;

    button.append(emoji, label);
    button.addEventListener("click", () => onAction(action.id));
    dock.append(button);
  }
}
