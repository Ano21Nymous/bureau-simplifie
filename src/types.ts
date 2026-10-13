export type ShortcutKind = "app" | "url" | "action";

/** Une tuile du bureau : une application, un site, ou une action interne. */
export interface Shortcut {
  id: string;
  label: string;
  kind: ShortcutKind;
  /** Commande à lancer, URL à ouvrir, ou identifiant d'action (print, scan, ...). */
  target: string;
  /** Arguments éventuels pour les applications. */
  args?: string[];
  /** Émoji servant d'icône (zéro dépendance, zéro requête réseau). */
  emoji: string;
  /** Couleur de fond de la tuile. */
  color: string;
}

export type ThemeName = "clair" | "sombre" | "contraste";

export interface Settings {
  /** Facteur d'agrandissement général du texte (1 = 100 %). */
  fontScale: number;
  theme: ThemeName;
  /** Volume système, de 0 à 100. */
  volume: number;
  /** Ville utilisée pour la météo. */
  city: string;
  /** Coordonnées mémorisées après géocodage. */
  lat?: number;
  lon?: number;
  /** Mode kiosque : plein écran, sans décorations, toujours au premier plan. */
  kiosk: boolean;
  /**
   * Mise à jour automatique au démarrage (Linux/kiosque).
   *
   * Le programme de mise à jour tourne en root avant la session graphique :
   * il relit ce champ dans le fichier de réglages de l'utilisateur pour savoir
   * s'il doit vérifier les nouvelles versions.
   */
  majAuto: boolean;
  shortcuts: Shortcut[];
}
