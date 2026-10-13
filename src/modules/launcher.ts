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
