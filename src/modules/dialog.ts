/** Petite fenêtre de message centrée, avec un unique bouton « OK ». */

let escHandler: ((event: KeyboardEvent) => void) | null = null;

export interface DialogOptions {
  /** Texte du bouton de fermeture (par défaut « OK »). */
  okLabel?: string;
}

/**
 * Affiche un message au centre de l'écran et attend que l'on appuie sur « OK »
 * (ou sur Entrée / Échap). Renvoie une promesse résolue à la fermeture.
 */
export function showDialog(message: string, options: DialogOptions = {}): Promise<void> {
  const layer = document.getElementById("dialog");
  if (!layer) return Promise.resolve();

  return new Promise<void>((resolve) => {
    layer.replaceChildren();
    layer.hidden = false;

    const box = document.createElement("section");
    box.className = "dialog";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", message);

    const text = document.createElement("p");
    text.className = "dialog__message";
    text.textContent = message;

    const actions = document.createElement("div");
    actions.className = "dialog__actions";

    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "button dialog__ok";
    ok.textContent = options.okLabel ?? "OK";

    const close = (): void => {
      if (escHandler) {
        document.removeEventListener("keydown", escHandler);
        escHandler = null;
      }
      layer.hidden = true;
      layer.replaceChildren();
      resolve();
    };

    ok.addEventListener("click", close);

    escHandler = (event) => {
      if (event.key === "Enter" || event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", escHandler);

    actions.append(ok);
    box.append(text, actions);
    layer.append(box);

    ok.focus();
  });
}
