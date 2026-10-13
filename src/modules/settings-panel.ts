import { readBrightness, setBrightness, setVolume } from "../ipc";
import type { Settings } from "../types";
import { openOverlay } from "./overlay";
import { toast } from "./toast";

export interface SettingsPanelContext {
  settings: Settings;
  onChange: (next: Settings) => void;
  onRefreshWeather: () => void;
}

/** Champ étiqueté (clic sur le texte = focus sur le contrôle). */
function field(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field";
  const span = document.createElement("span");
  span.className = "field__label";
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

interface SliderParts {
  control: HTMLInputElement;
  value: HTMLSpanElement;
}

/** Curseur de 0 à 100 accompagné de sa valeur en pourcentage. */
function slider(initial: number, onValue: (value: number) => void): SliderParts {
  const value = document.createElement("span");
  value.className = "field__value";
  value.textContent = `${initial} %`;

  const control = document.createElement("input");
  control.type = "range";
  control.min = "0";
  control.max = "100";
  control.step = "1";
  control.value = String(initial);
  control.addEventListener("input", () => {
    const next = Number(control.value);
    value.textContent = `${next} %`;
    onValue(next);
  });

  return { control, value };
}

/** Place un curseur et sa valeur sur une même ligne. */
function sliderRow(parts: SliderParts): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "slider-row";
  row.append(parts.control, parts.value);
  return row;
}

/**
 * Interrupteur (toggle) étiqueté, sur une seule ligne.
 *
 * Construit à partir d'une case à cocher masquée : le clic sur toute la ligne
 * l'active (comportement natif d'un `<label>`), et le clavier fonctionne aussi.
 */
function switchField(
  labelText: string,
  initial: boolean,
  onToggle: (value: boolean) => void,
): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field field--switch";

  const text = document.createElement("span");
  text.className = "field__label";
  text.textContent = labelText;

  const switchWrap = document.createElement("span");
  switchWrap.className = "switch";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "switch__input";
  input.checked = initial;
  input.setAttribute("role", "switch");
  input.setAttribute("aria-label", labelText);
  input.addEventListener("change", () => {
    onToggle(input.checked);
  });

  const track = document.createElement("span");
  track.className = "switch__track";
  const knob = document.createElement("span");
  knob.className = "switch__knob";
  track.append(knob);

  switchWrap.append(input, track);
  label.append(text, switchWrap);
  return label;
}

/** Évite de marteler le système pendant que le doigt glisse. */
function debounced(action: (value: number) => void, delay: number): (value: number) => void {
  let timer: number | undefined;
  return (value) => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => action(value), delay);
  };
}

export function openSettingsPanel(context: SettingsPanelContext): void {
  let current = context.settings;

  const update = (patch: Partial<Settings>): void => {
    current = { ...current, ...patch };
    context.settings = current;
    context.onChange(current);
  };

  openOverlay("Paramètres", (body) => {
    // ------------------------------ Luminosité -----------------------------
    const applyBrightness = debounced((value) => {
      void setBrightness(value).catch((error: unknown) => {
        console.error("Luminosité non appliquée", error);
      });
    }, 120);

    const brightness = slider(100, applyBrightness);
    const brightnessField = field("Luminosité", sliderRow(brightness));
    body.append(brightnessField);

    // Un écran externe n'a pas toujours de rétroéclairage réglable : dans ce
    // cas, la ligne disparaît plutôt que de proposer un curseur inopérant.
    void readBrightness().then((level) => {
      if (level === null) {
        brightnessField.hidden = true;
        return;
      }
      brightness.control.value = String(level);
      brightness.value.textContent = `${level} %`;
    });

    // ---------------------------------- Son --------------------------------
    const applyVolume = debounced((value) => void setVolume(value), 120);
    const volume = slider(current.volume, (value) => {
      update({ volume: value });
      applyVolume(value);
    });
    body.append(field("Son", sliderRow(volume)));

    // --------------------------------- Ville -------------------------------
    const cityInput = document.createElement("input");
    cityInput.type = "text";
    cityInput.className = "text-input";
    cityInput.placeholder = "Ex. Lyon";
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
    cityRow.className = "slider-row";
    cityRow.append(cityInput, citySave);
    body.append(field("Ville (météo)", cityRow));

    // --------------------- Mise à jour automatique -------------------------
    body.append(
      switchField("Mise à jour automatique", current.majAuto, (value) => {
        update({ majAuto: value });
        toast(
          value
            ? "Mise à jour automatique activée."
            : "Mise à jour automatique désactivée.",
        );
      }),
    );
  });
}
