import { launchApp, openUrl, systemRun } from "../ipc";
import type { CommandSpec } from "../system-commands";
import { DOCUMENTS_FOLDER, SCAN_APPS } from "../system-commands";
import type { Shortcut } from "../types";
import { toast } from "./toast";

/**
 * Essaie une liste de commandes jusqu'à ce que l'une démarre.
 * Renvoie la commande qui a fonctionné, ou null.
 */
async function launchFirstAvailable(specs: CommandSpec[]): Promise<CommandSpec | null> {
  for (const spec of specs) {
    try {
      await launchApp(spec.program, spec.args);
      return spec;
    } catch {
      // On tente la commande suivante.
    }
  }
  return null;
}

/** Lance le programme associé à une tuile. */
export async function runShortcut(shortcut: Shortcut): Promise<void> {
  try {
    switch (shortcut.kind) {
      case "url":
        await openUrl(shortcut.target);
        return;
      case "app":
        await launchApp(shortcut.target, shortcut.args ?? []);
        return;
      case "action":
        await runAction(shortcut.target);
        return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast(`« ${shortcut.label} » n'a pas pu s'ouvrir. (${message})`, "error");
  }
}

/** Actions internes proposées depuis le menu du bas. */
export async function runAction(id: string): Promise<void> {
  switch (id) {
    case "scan": {
      const used = await launchFirstAvailable(SCAN_APPS);
      if (!used) {
        toast(
          "Aucun logiciel de numérisation trouvé. Installez « simple-scan ».",
          "error",
        );
      }
      return;
    }
    case "print": {
      try {
        await launchApp(DOCUMENTS_FOLDER.program, DOCUMENTS_FOLDER.args);
        toast("Choisissez le document, puis appuyez sur Ctrl+P pour imprimer.");
      } catch {
        toast("Impossible d'ouvrir le dossier Documents.", "error");
      }
      return;
    }
    case "printer-utility": {
      try {
        await systemRun("system-config-printer", []);
      } catch {
        toast("Outil d'imprimante indisponible.", "error");
      }
      return;
    }
    default:
      toast(`Action inconnue : ${id}`, "error");
  }
}
