/** Petit bandeau de message en bas de l'écran, très lisible. */
let timer: number | undefined;

export function toast(message: string, kind: "info" | "error" = "info"): void {
  const el = document.getElementById("toast");
  if (!el) return;

  el.textContent = message;
  el.dataset.kind = kind;
  el.hidden = false;
  el.classList.add("toast--visible");

  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    el.classList.remove("toast--visible");
    window.setTimeout(() => {
      el.hidden = true;
    }, 250);
  }, kind === "error" ? 5000 : 2600);
}
