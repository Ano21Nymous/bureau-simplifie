/**
 * Commandes système utilisées par le bureau. Regroupées ici pour être
 * faciles à adapter à la distribution de la personne qui utilise l'appareil.
 *
 * Les listes sont essayées dans l'ordre : la première commande qui se lance
 * correctement est utilisée.
 */

export interface CommandSpec {
  program: string;
  args: string[];
}

/** Applications de numérisation de documents, dans l'ordre de préférence. */
export const SCAN_APPS: CommandSpec[] = [
  { program: "simple-scan", args: [] },
  { program: "xsane", args: [] },
  { program: "skanlite", args: [] },
];

/** Ouverture d'un document existant (pour l'imprimer ensuite). */
export const DOCUMENTS_FOLDER: CommandSpec = {
  program: "xdg-open",
  args: ["~/Documents"],
};

/** Nettoyage / file d'attente d'impression (utile en cas de bourrage). */
export const PRINTER_UTIL: CommandSpec = {
  program: "system-config-printer",
  args: [],
};
