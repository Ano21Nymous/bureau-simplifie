/** Fenêtre modale générique (réglages, sites…). */

let escHandler: ((event: KeyboardEvent) => void) | null = null;

export function openOverlay(title: string, build: (body: HTMLElement) => void): void {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;

  overlay.replaceChildren();
  overlay.hidden = false;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", title);

  const header = document.createElement("header");
  header.className = "panel__header";

  const heading = document.createElement("h2");
  heading.className = "panel__title";
  heading.textContent = title;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "panel__close";
  close.textContent = "Fermer";
  close.addEventListener("click", closeOverlay);

  header.append(heading, close);

  const body = document.createElement("div");
  body.className = "panel__body";
  build(body);

  panel.append(header, body);
  overlay.append(panel);

  overlay.onclick = (event) => {
    if (event.target === overlay) closeOverlay();
  };

  escHandler = (event) => {
    if (event.key === "Escape") closeOverlay();
  };
  document.addEventListener("keydown", escHandler);

  requestAnimationFrame(() => overlay.classList.add("overlay--visible"));
}

export function closeOverlay(): void {
  const overlay = document.getElementById("overlay");
  if (!overlay) return;

  if (escHandler) {
    document.removeEventListener("keydown", escHandler);
    escHandler = null;
  }

  overlay.classList.remove("overlay--visible");
  overlay.hidden = true;
  overlay.replaceChildren();
  overlay.onclick = null;
}
