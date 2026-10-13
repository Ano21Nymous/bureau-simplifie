import { saveScan, scanDocument } from "../ipc";
import { openOverlay } from "./overlay";
import { toast } from "./toast";

/**
 * Écran de numérisation, ouvert par la tuile « Imprimante ».
 *
 * Il occupe tout l'écran (comme les Paramètres) et propose trois choses :
 *   - « Numériser »   : lance le scanner et affiche l'aperçu ;
 *   - l'aperçu        : une fois le document scanné ;
 *   - « Télécharger » : enregistre le document dans le dossier Images.
 * La croix en haut à droite ferme l'écran et ramène au bureau.
 */
export function openScanPanel(): void {
  openOverlay("Imprimante", (body) => {
    // Chemin du dernier document scanné (nécessaire pour l'enregistrer).
    let scannedPath: string | null = null;

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

    // ----------------------------- Les boutons -----------------------------
    const actions = document.createElement("div");
    actions.className = "scan__actions";

    const scanButton = document.createElement("button");
    scanButton.type = "button";
    scanButton.className = "button";
    scanButton.textContent = "Numériser";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button button--secondary";
    saveButton.textContent = "Télécharger";
    saveButton.disabled = true; // rien à enregistrer tant qu'on n'a rien scanné

    actions.append(scanButton, saveButton);
    scan.append(preview, actions);
    body.append(scan);

    // ------------------------------ Numériser -------------------------------
    scanButton.addEventListener("click", () => {
      void (async () => {
        scanButton.disabled = true;
        scanButton.textContent = "Numérisation…";
        saveButton.disabled = true;
        image.hidden = true;
        image.removeAttribute("src");
        empty.hidden = false;
        empty.textContent = "Numérisation en cours…";

        try {
          const result = await scanDocument();
          scannedPath = result.path;
          image.src = result.dataUrl;
          image.hidden = false;
          empty.hidden = true;
          saveButton.disabled = false;
          toast("Document numérisé.");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          empty.hidden = false;
          empty.textContent = message;
          toast("La numérisation a échoué.", "error");
        } finally {
          scanButton.disabled = false;
          scanButton.textContent = "Numériser";
        }
      })();
    });

    // ----------------------------- Télécharger -----------------------------
    saveButton.addEventListener("click", () => {
      if (!scannedPath) return;
      void (async () => {
        saveButton.disabled = true;
        try {
          const destination = await saveScan(scannedPath);
          toast(`Document enregistré dans ${destination}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toast(`Enregistrement impossible. (${message})`, "error");
        } finally {
          saveButton.disabled = false;
        }
      })();
    });
  });
}
