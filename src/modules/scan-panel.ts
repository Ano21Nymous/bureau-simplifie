import { emailScans, saveScans, scanDocument, type ScanResult } from "../ipc";
import { openOverlay } from "./overlay";
import { toast } from "./toast";

/**
 * Écran de numérisation, ouvert par la tuile « Imprimante ».
 *
 * Il occupe tout l'écran (comme les Paramètres) et permet de scanner un
 * document en plusieurs pages, puis de :
 *   - « Envoyer par mail »  : ouvre la messagerie avec les pages en pièces jointes ;
 *   - « Télécharger »       : enregistre les pages dans le dossier Images.
 * La croix en haut à droite ferme l'écran et ramène au bureau.
 */
export function openScanPanel(): void {
  openOverlay("Imprimante", (body) => {
    // Pages numérisées, dans l'ordre, et celle affichée en grand.
    const pages: ScanResult[] = [];
    let current = 0;

    const scan = document.createElement("div");
    scan.className = "scan";

    // ----------------------------- L'aperçu --------------------------------
    const preview = document.createElement("div");
    preview.className = "scan__preview";

    const empty = document.createElement("p");
    empty.className = "scan__empty";
    empty.textContent = "Appuyez sur « Numériser » pour scanner un document.";

    const image = document.createElement("img");
    image.className = "scan__image";
    image.alt = "Aperçu du document numérisé";
    image.hidden = true;

    preview.append(empty, image);

    // --------------------- Les vignettes des pages -------------------------
    const pagesStrip = document.createElement("div");
    pagesStrip.className = "scan__pages";
    pagesStrip.hidden = true;

    // ----------------------------- Les boutons -----------------------------
    const actions = document.createElement("div");
    actions.className = "scan__actions";

    const scanButton = document.createElement("button");
    scanButton.type = "button";
    scanButton.className = "button";
    scanButton.textContent = "Numériser";

    const mailButton = document.createElement("button");
    mailButton.type = "button";
    mailButton.className = "button";
    mailButton.textContent = "Envoyer par mail";
    mailButton.disabled = true;

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button";
    saveButton.textContent = "Télécharger";
    saveButton.disabled = true;

    actions.append(scanButton, mailButton, saveButton);
    scan.append(preview, pagesStrip, actions);
    body.append(scan);

    /** Affiche en grand la page sélectionnée (ou l'invite de départ). */
    function renderPreview(): void {
      const page = pages[current];
      if (!page) {
        image.hidden = true;
        image.removeAttribute("src");
        empty.hidden = false;
        empty.textContent = "Appuyez sur « Numériser » pour scanner un document.";
        return;
      }
      empty.hidden = true;
      image.src = page.dataUrl;
      image.hidden = false;
    }

    /** Met à jour la bande de vignettes. */
    function renderPages(): void {
      pagesStrip.replaceChildren();
      pagesStrip.hidden = pages.length === 0;
      if (pages.length === 0) return;

      const label = document.createElement("span");
      label.className = "scan__pages-label";
      label.textContent = pages.length > 1 ? `${pages.length} pages` : "1 page";
      pagesStrip.append(label);

      pages.forEach((page, index) => {
        const item = document.createElement("div");
        item.className = "scan__page";
        if (index === current) item.classList.add("scan__page--current");

        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "scan__page-thumb";
        thumb.title = `Voir la page ${index + 1}`;
        thumb.setAttribute("aria-label", `Voir la page ${index + 1}`);
        const mini = document.createElement("img");
        mini.src = page.dataUrl;
        mini.alt = "";
        thumb.append(mini);
        thumb.addEventListener("click", () => {
          current = index;
          renderPreview();
          renderPages();
        });

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "scan__page-remove";
        remove.textContent = "✕";
        remove.title = `Supprimer la page ${index + 1}`;
        remove.setAttribute("aria-label", `Supprimer la page ${index + 1}`);
        remove.addEventListener("click", () => {
          pages.splice(index, 1);
          if (current >= pages.length) current = Math.max(0, pages.length - 1);
          renderPreview();
          renderPages();
          renderActions();
        });

        item.append(thumb, remove);
        pagesStrip.append(item);
      });
    }

    /** Active ou désactive les boutons selon qu'il y a des pages ou non. */
    function renderActions(): void {
      const hasPages = pages.length > 0;
      mailButton.disabled = !hasPages;
      saveButton.disabled = !hasPages;
    }

    // ------------------------------ Numériser -------------------------------
    scanButton.addEventListener("click", () => {
      void (async () => {
        scanButton.disabled = true;
        scanButton.textContent = "Numérisation…";
        mailButton.disabled = true;
        saveButton.disabled = true;
        if (pages.length === 0) {
          empty.hidden = false;
          empty.textContent = "Numérisation en cours…";
        }

        try {
          const result = await scanDocument();
          pages.push(result);
          current = pages.length - 1;
          renderPreview();
          renderPages();
          toast(
            pages.length > 1 ? `Page ${pages.length} numérisée.` : "Document numérisé.",
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (pages.length === 0) {
            empty.hidden = false;
            empty.textContent = message;
          }
          toast(`La numérisation a échoué. (${message})`, "error");
        } finally {
          scanButton.disabled = false;
          scanButton.textContent = "Numériser";
          renderActions();
        }
      })();
    });

    // --------------------------- Envoyer par mail --------------------------
    mailButton.addEventListener("click", () => {
      if (pages.length === 0) return;
      void (async () => {
        mailButton.disabled = true;
        try {
          await emailScans(pages.map((page) => page.path));
          toast(
            "Message ouvert dans la messagerie. Ajoutez le destinataire, puis envoyez.",
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast(`Ouverture du mail impossible. (${message})`, "error");
        } finally {
          renderActions();
        }
      })();
    });

    // ----------------------------- Télécharger -----------------------------
    saveButton.addEventListener("click", () => {
      if (pages.length === 0) return;
      void (async () => {
        saveButton.disabled = true;
        try {
          const destinations = await saveScans(pages.map((page) => page.path));
          toast(
            destinations.length > 1
              ? `${destinations.length} pages enregistrées dans Images.`
              : `Document enregistré dans ${destinations[0]}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast(`Enregistrement impossible. (${message})`, "error");
        } finally {
          renderActions();
        }
      })();
    });

    renderPreview();
    renderPages();
    renderActions();
  });
}
