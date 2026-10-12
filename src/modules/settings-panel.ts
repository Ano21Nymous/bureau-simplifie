import { setKiosk, setVolume } from "../ipc";
import type { Settings, Shortcut, ShortcutKind, ThemeName } from "../types";
import { openOverlay } from "./overlay";
import { toast } from "./toast";

export interface SettingsPanelContext {
  settings: Settings;
  onChange: (next: Settings) => void;
  onRefreshWeather: () => void;
  onQuit: () => void;
}

const THEMES: Array<{ id: ThemeName; label: string }> = [
  { id: "clair", label: "Clair" },
  { id: "sombre", label: "Sombre" },
  { id: "contraste", label: "Très contrasté" },
];

/** Crée un champ étiqueté (clic sur le texte = focus sur le contrôle). */
function field(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field";
  const span = document.createElement("span");
  span.className = "field__label";
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function section(title: string): HTMLElement {
  const element = document.createElement("section");
  element.className = "settings__section";
  const heading = document.createElement("h3");
  heading.className = "settings__heading";
  heading.textContent = title;
  element.append(heading);
  return element;
}

function textInput(placeholder: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "text-input";
  input.placeholder = placeholder;
  return input;
}

export function openSettingsPanel(context: SettingsPanelContext): void {
  let current = context.settings;

  const update = (patch: Partial<Settings>): void => {
    current = { ...current, ...patch };
    context.settings = current;
    context.onChange(current);
  };

  openOverlay("Réglages", (body) => {
    // ------------------------- Confort de lecture -------------------------
    const display = section("Confort de lecture");

    const fontValue = document.createElement("span");
    fontValue.className = "field__value";
    fontValue.textContent = `${Math.round(current.fontScale * 100)} %`;

    const font = document.createElement("input");
    font.type = "range";
    font.min = "1";
    font.max = "2";
    font.step = "0.05";
    font.value = String(current.fontScale);
    font.addEventListener("input", () => {
      const value = Number(font.value);
      fontValue.textContent = `${Math.round(value * 100)} %`;
      update({ fontScale: value });
    });

    const fontField = field("Taille du texte", font);
    fontField.append(fontValue);
    display.append(fontField);

    const themeButtons = document.createElement("div");
    themeButtons.className = "theme-choice";
    const themeEls = new Map<ThemeName, HTMLButtonElement>();
    for (const theme of THEMES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-choice__button";
      button.textContent = theme.label;
      button.classList.toggle("is-active", current.theme === theme.id);
      button.addEventListener("click", () => {
        update({ theme: theme.id });
        for (const [id, element] of themeEls) {
          element.classList.toggle("is-active", id === theme.id);
        }
      });
      themeEls.set(theme.id, button);
      themeButtons.append(button);
    }
    display.append(field("Couleurs", themeButtons));
    body.append(display);

    // --------------------------------- Son --------------------------------
    const sound = section("Son");

    const volumeValue = document.createElement("span");
    volumeValue.className = "field__value";
    volumeValue.textContent = `${current.volume} %`;

    const volume = document.createElement("input");
    volume.type = "range";
    volume.min = "0";
    volume.max = "100";
    volume.step = "1";
    volume.value = String(current.volume);
    let volumeTimer: number | undefined;
    volume.addEventListener("input", () => {
      const value = Number(volume.value);
      volumeValue.textContent = `${value} %`;
      update({ volume: value });
      if (volumeTimer !== undefined) window.clearTimeout(volumeTimer);
      volumeTimer = window.setTimeout(() => {
        void setVolume(value);
      }, 120);
    });

    const volumeField = field("Volume", volume);
    volumeField.append(volumeValue);
    sound.append(volumeField);
    body.append(sound);

    // -------------------------------- Météo -------------------------------
    const weather = section("Météo");

    const cityInput = textInput("Ex. Lyon");
    cityInput.value = current.city;
    cityInput.setAttribute("aria-label", "Ville pour la météo");

    const citySave = document.createElement("button");
    citySave.type = "button";
    citySave.className = "button";
    citySave.textContent = "Enregistrer";
    citySave.addEventListener("click", () => {
      const city = cityInput.value.trim();
      if (!city) {
        toast("Indiquez un nom de ville.");
        return;
      }
      update({ city, lat: undefined, lon: undefined });
      context.onRefreshWeather();
      toast(`Ville enregistrée : ${city}`);
    });

    const cityRow = document.createElement("div");
    cityRow.className = "inline";
    cityRow.append(cityInput, citySave);
    weather.append(field("Ville", cityRow));
    body.append(weather);

    // ----------------------------- Verrouillage ---------------------------
    const kiosk = section("Verrouillage");

    const kioskToggle = document.createElement("input");
    kioskToggle.type = "checkbox";
    kioskToggle.className = "checkbox";
    kioskToggle.checked = current.kiosk;
    kioskToggle.addEventListener("change", () => {
      const enabled = kioskToggle.checked;
      update({ kiosk: enabled });
      void setKiosk(enabled);
      if (enabled) {
        toast("Mode verrouillé activé. Cliquez 5 fois sur l'heure pour en sortir.");
      }
    });
    kiosk.append(field("Mode kiosque (plein écran verrouillé)", kioskToggle));

    const kioskHint = document.createElement("p");
    kioskHint.className = "hint";
    kioskHint.textContent =
      "Pour sortir du mode verrouillé : cliquez 5 fois rapidement sur l'heure, en haut à gauche.";
    kiosk.append(kioskHint);
    body.append(kiosk);

    // ------------------------------ Raccourcis ----------------------------
    const shortcuts = section("Mes raccourcis");

    const list = document.createElement("div");
    list.className = "shortcut-list";

    const renderList = (): void => {
      list.replaceChildren();
      for (const shortcut of current.shortcuts) {
        const row = document.createElement("div");
        row.className = "shortcut-row";

        const emoji = document.createElement("span");
        emoji.className = "shortcut-row__emoji";
        emoji.textContent = shortcut.emoji;

        const info = document.createElement("span");
        info.className = "shortcut-row__info";
        const kindLabel =
          shortcut.kind === "app" ? "application" : shortcut.kind === "url" ? "site" : "action";
        info.textContent = `${shortcut.label} (${kindLabel}) — ${shortcut.target}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "shortcut-row__remove";
        remove.textContent = "Retirer";
        remove.addEventListener("click", () => {
          update({ shortcuts: current.shortcuts.filter((item) => item.id !== shortcut.id) });
          renderList();
        });

        row.append(emoji, info, remove);
        list.append(row);
      }
    };
    renderList();
    shortcuts.append(list);

    const addLabel = textInput("Nom (ex. Mes photos)");
    const kindSelect = document.createElement("select");
    kindSelect.className = "text-input";
    const kindOptions: Array<[ShortcutKind, string]> = [
      ["app", "Application"],
      ["url", "Site internet"],
      ["action", "Action interne"],
    ];
    for (const [value, text] of kindOptions) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      kindSelect.append(option);
    }
    const addTarget = textInput("Commande ou adresse (ex. firefox, https://…)");
    const addArgs = textInput("Arguments, séparés par des espaces (optionnel)");

    const emojiInput = document.createElement("input");
    emojiInput.type = "text";
    emojiInput.className = "text-input text-input--short";
    emojiInput.value = "⭐";
    emojiInput.maxLength = 4;
    emojiInput.setAttribute("aria-label", "Émoji de la tuile");

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "color-input";
    colorInput.value = "#2f6fed";
    colorInput.setAttribute("aria-label", "Couleur de la tuile");

    const emojiColorRow = document.createElement("div");
    emojiColorRow.className = "inline";
    emojiColorRow.append(emojiInput, colorInput);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "button";
    addButton.textContent = "Ajouter la tuile";
    addButton.addEventListener("click", () => {
      const label = addLabel.value.trim();
      const target = addTarget.value.trim();
      if (!label || !target) {
        toast("Indiquez au moins un nom et une commande ou une adresse.");
        return;
      }
      const args = addArgs.value.trim() ? addArgs.value.trim().split(/\s+/) : [];
      const shortcut: Shortcut = {
        id: crypto.randomUUID(),
        label,
        kind: kindSelect.value as ShortcutKind,
        target,
        args,
        emoji: emojiInput.value.trim() || "⭐",
        color: colorInput.value,
      };
      update({ shortcuts: [...current.shortcuts, shortcut] });
      renderList();
      addLabel.value = "";
      addTarget.value = "";
      addArgs.value = "";
      toast(`« ${label} » a été ajouté au bureau.`);
    });

    shortcuts.append(
      addLabel,
      kindSelect,
      addTarget,
      addArgs,
      field("Émoji et couleur", emojiColorRow),
      addButton,
    );
    body.append(shortcuts);

    // --------------------------------- Sortie -----------------------------
    const footer = document.createElement("div");
    footer.className = "settings__footer";

    const quit = document.createElement("button");
    quit.type = "button";
    quit.className = "button button--danger";
    quit.textContent = "Quitter le bureau";
    quit.addEventListener("click", () => {
      if (window.confirm("Fermer le bureau simplifié ?")) context.onQuit();
    });

    footer.append(quit);
    body.append(footer);
  });
}
