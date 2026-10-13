import { SHORTCUT_ICONS } from "../icons";
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
    tile.setAttribute("aria-label", shortcut.label);

    // Icône elementary pour les tuiles connues, émoji sinon.
    const iconUrl = SHORTCUT_ICONS[shortcut.id];
    if (iconUrl) {
      const icon = document.createElement("img");
      icon.className = "tile__icon";
      icon.src = iconUrl;
      icon.alt = "";
      icon.draggable = false;
      tile.append(icon);
    } else {
      const emoji = document.createElement("span");
      emoji.className = "tile__emoji";
      emoji.textContent = shortcut.emoji;
      tile.append(emoji);
    }

    const label = document.createElement("span");
    label.className = "tile__label";
    label.textContent = shortcut.label;

    tile.append(label);
    tile.addEventListener("click", () => onShortcut(shortcut));
    grid.append(tile);
  }
}
