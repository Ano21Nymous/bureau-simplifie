/**
 * Icônes du bureau, reprises du projet elementary (voir assets/icons/NOTICE.md).
 *
 * Les tuiles par défaut utilisent les vraies icônes elementary ; une tuile
 * ajoutée à la main garde son émoji en attendant une icône dédiée.
 */

import imprimante from "./assets/icons/imprimante.svg";
import internet from "./assets/icons/internet.svg";
import mail from "./assets/icons/mail.svg";
import meteoClear from "./assets/icons/meteo-clear.svg";
import meteoFewClouds from "./assets/icons/meteo-few-clouds.svg";
import meteoFog from "./assets/icons/meteo-fog.svg";
import meteoOvercast from "./assets/icons/meteo-overcast.svg";
import meteoShowers from "./assets/icons/meteo-showers.svg";
import meteoShowersScattered from "./assets/icons/meteo-showers-scattered.svg";
import meteoSnow from "./assets/icons/meteo-snow.svg";
import meteoStorm from "./assets/icons/meteo-storm.svg";
import parametres from "./assets/icons/parametres.svg";

/** Icônes des tuiles par défaut, indexées par identifiant de raccourci. */
export const SHORTCUT_ICONS: Record<string, string> = {
  navigateur: internet,
  courrier: mail,
  imprimante: imprimante,
  parametres: parametres,
};

/** Icônes correspondant aux états météo renvoyés par weather.ts. */
export const WEATHER_ICONS: Record<string, string> = {
  clear: meteoClear,
  "few-clouds": meteoFewClouds,
  overcast: meteoOvercast,
  fog: meteoFog,
  showers: meteoShowers,
  "showers-scattered": meteoShowersScattered,
  snow: meteoSnow,
  storm: meteoStorm,
};
