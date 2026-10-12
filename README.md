# Bureau Simplifié

Un « bureau » d'ordinateur ultra-épuré : de **gros boutons**, de **gros caractères**,
l'heure, la date, la météo, quelques sites, et c'est tout. Pensé pour être confié
à une personne peu à l'aise avec l'informatique.

Construit avec **Tauri 2** (coquille native minuscule + webview du système) et un
front **TypeScript vanilla** sans framework.

## Pourquoi c'est léger et rapide

| Choix | Effet |
| --- | --- |
| Aucun framework front (pas de React/Vue) | bundle JS final ≈ **17 ko** |
| Aucun greffon Tauri externe | surface de code native minimale |
| `tauri` seul + `serde_json` | très peu de dépendances Rust |
| Icônes en émoji | zéro image, zéro requête réseau |
| Météo via Open-Meteo | pas de clé d'API, pas de compte, pas de tracking |
| `opt-level = "s"`, LTO, `strip`, `panic = "abort"` | binaire final le plus petit possible |
| Webview fournie par l'OS (WebKitGTK sous Linux) | pas de Chromium embarqué (≠ Electron) |

## Prérequis

- **Node.js** ≥ 20 (testé en v24) et npm
- **Rust** via [rustup](https://rustup.rs/)
- **Git**

Sous Linux, pour compiler localement, il faut en plus les bibliothèques de
développement (voir la section *Compilation*).

## Démarrage rapide (développement de l'interface)

Toute l'interface se développe **dans le navigateur**, sans rien compiler côté
natif. C'est le moyen le plus rapide d'itérer.

```bash
npm install
npm run dev
```

Ouvrez ensuite <http://localhost:5173>. Les actions système (lancer une
application, régler le volume, ouvrir un site) sont **simulées** dans ce mode :
elles s'affichent dans la console au lieu d'être exécutées réellement.

> `npm run typecheck` vérifie les types, `npm run build` produit le dossier `dist/`.

## Développement avec la vraie fenêtre native

```bash
npm run desktop:dev     # = tauri dev
```

- **Sous Linux** : installez d'abord les dépendances système (voir ci-dessous).
- **Sous Windows** : il faut la chaîne **MSVC** (« Desktop development with C++ »
  des Visual Studio Build Tools). Sans elle, `tauri dev` ne peut pas produire
  d'exécutable. En attendant, travaillez en mode navigateur.

### Dépendances système Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev librsvg2-dev patchelf
```

## Compiler pour Linux depuis GitHub Actions

Comme la machine de développement ne compile pas pour Linux, **l'intégration
continue s'en charge**. Le workflow `.github/workflows/build.yml` :

1. se déclenche sur `push` (branche `main`), sur les tags `v*`, sur les pull
   requests et manuellement (`workflow_dispatch`) ;
2. compile sur `ubuntu-22.04` et produit les paquets **`.deb`**, **`.rpm`** et
   **`.AppImage`** ;
3. compile aussi un installateur Windows **`.exe`** (pratique pour tester) ;
4. publie les paquets dans les *artifacts* du workflow.

Pour l'activer :

```bash
git init
git add -A
git commit -m "Bureau simplifié : première version"
git branch -M main
git remote add origin https://github.com/<vous>/bureau-simplifie.git
git push -u origin main
```

Ensuite, l'onglet **Actions** de GitHub produit les paquets à chaque `push`.
Pour créer une « release » propre, poussez un tag :

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Installer sur l'ordinateur de destination (Linux)

Récupérez le `.AppImage` (le plus simple) :

```bash
chmod +x Bureau_Simplifie_0.1.0_amd64.AppImage
./Bureau_Simplifie_0.1.0_amd64.AppImage
```

Ou le `.deb` :

```bash
sudo dpkg -i bureau-simplifie_0.1.0_amd64.deb
sudo apt -f install   # si des dépendances manquent
```

### Lancement automatique à l'ouverture de session

Copiez le fichier `.desktop` installé (ou créez-le) dans le démarrage
automatique :

```bash
mkdir -p ~/.config/autostart
cp /usr/share/applications/Bureau\ Simplifié.desktop ~/.config/autostart/
```

Pour démarrer directement en **mode kiosque**, ajoutez l'option dans le
fichier `~/.config/bureau-simplifie/settings.json` (`"kiosk": true`) — le
réglage se met également depuis l'écran *Réglages*.

## Mode kiosque

Quand le mode kiosque est actif : plein écran, sans cadre, toujours au premier
plan, menu contextuel désactivé.

Pour en sortir : **cliquez 5 fois rapidement sur l'heure** en haut à gauche,
ou utilisez `Ctrl` + `Maj` + `Q` pour quitter complètement.

## Personnalisation

- **Ville de la météo**, **taille du texte**, **thème** (clair / sombre / très
  contrasté), **volume** et **raccourcis** : tout se règle depuis le bouton
  **Réglages** du bas de l'écran.
- Les raccourcis par défaut sont définis dans `src/defaults.ts`.
- Les commandes de numérisation / impression sont regroupées dans
  `src/system-commands.ts` (utile selon la distribution : `simple-scan`,
  `xsane`, `skanlite`…).
- Les réglages de l'utilisateur sont enregistrés dans
  `settings.json` (dossier de configuration de l'application).

## Structure du projet

```
.
├─ index.html                  Page hôte de l'interface
├─ src/
│  ├─ main.ts                  Point d'entrée : état, horloge, météo, rendu
│  ├─ ipc.ts                   Pont vers le natif (+ repli navigateur)
│  ├─ types.ts                 Types partagés
│  ├─ defaults.ts              Raccourcis et réglages par défaut
│  ├─ system-commands.ts       Commandes système (numérisation, impression…)
│  ├─ style.css                Styles et thèmes
│  └─ modules/
│     ├─ launcher.ts           Grille de tuiles + menu du bas
│     ├─ clock.ts              Horloge et date
│     ├─ weather.ts            Météo Open-Meteo
│     ├─ actions.ts            Exécution des raccourcis
│     ├─ browser-panel.ts      Écran « Mes sites »
│     ├─ settings-panel.ts     Écran « Réglages »
│     ├─ overlay.ts            Fenêtre modale générique
│     └─ toast.ts              Messages en bas d'écran
├─ src-tauri/                  Coquille native Rust
│  ├─ src/lib.rs               Commandes natives
│  ├─ src/main.rs
│  ├─ tauri.conf.json          Configuration de l'application
│  ├─ capabilities/default.json
│  ├─ Cargo.toml
│  └─ icons/                   Icônes (générées depuis app-icon.svg)
└─ .github/workflows/build.yml Compilation Linux/Windows
```

## Notes de sécurité

Les commandes natives (`launch_app`, `system_run`) exécutent des programmes
arbitraires : c'est **nécessaire** pour un lanceur d'applications, mais cela
signifie qu'un raccourci mal saisi peut lancer n'importe quoi. Les URL ouvertes
sont, elles, limitées aux schémas `http` et `https`. Gardez cette application
sur un compte utilisateur dédié, sans droits particuliers.
