import { openUrl } from "../ipc";
import type { Shortcut } from "../types";
import { openOverlay } from "./overlay";
import { toast } from "./toast";

/** Moteur de recherche utilisé quand on tape des mots plutôt qu'une adresse. */
const SEARCH_URL = "https://duckduckgo.com/?q=";

function normalizeAddress(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(value)) return `https://${value}`;
  return SEARCH_URL + encodeURIComponent(value);
}

function makeSiteButton(shortcut: Shortcut): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "site";
  button.style.setProperty("--tile-color", shortcut.color);

  const emoji = document.createElement("span");
  emoji.className = "site__emoji";
  emoji.textContent = shortcut.emoji;

  const label = document.createElement("span");
  label.className = "site__label";
  label.textContent = shortcut.label;

  button.append(emoji, label);
  button.addEventListener("click", () => {
    void openUrl(shortcut.target);
  });
  return button;
}

/** Écran « Mes sites » : gros raccourcis + barre d'adresse simple. */
export function openSitePanel(shortcuts: Shortcut[]): void {
  openOverlay("Mes sites", (body) => {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      "Cliquez sur un site, ou tapez une adresse puis appuyez sur Entrée. " +
      "Les pages s'ouvrent dans le navigateur de l'ordinateur.";
    body.append(hint);

    const sites = shortcuts.filter((shortcut) => shortcut.kind === "url");
    if (sites.length > 0) {
      const grid = document.createElement("div");
      grid.className = "site-grid";
      for (const site of sites) grid.append(makeSiteButton(site));
      body.append(grid);
    }

    const form = document.createElement("form");
    form.className = "address";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "address__input";
    input.placeholder = "Adresse du site, ou mots à rechercher";
    input.setAttribute("aria-label", "Adresse du site");
    input.autocomplete = "off";

    const go = document.createElement("button");
    go.type = "submit";
    go.className = "address__go";
    go.textContent = "Ouvrir";

    form.append(input, go);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const url = normalizeAddress(input.value);
      if (!url) {
        toast("Tapez une adresse ou une recherche.");
        return;
      }
      input.value = "";
      void openUrl(url);
    });

    body.append(form);
  });
}
