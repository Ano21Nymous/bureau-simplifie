/** Horloge : heure et date en très gros, mises à jour une fois par seconde. */

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function startClock(): () => void {
  const timeEl = document.getElementById("clock-time");
  const dateEl = document.getElementById("clock-date");

  const tick = (): void => {
    const now = new Date();
    if (timeEl) timeEl.textContent = timeFormatter.format(now);
    if (dateEl) {
      const text = dateFormatter.format(now);
      dateEl.textContent = text.charAt(0).toUpperCase() + text.slice(1);
    }
  };

  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}
