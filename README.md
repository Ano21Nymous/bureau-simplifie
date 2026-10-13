# Bureau Simplifié

Un « bureau » d'ordinateur ultra-épuré : de **gros boutons**, de **gros caractères**,
l'heure, la date, la météo, **quatre grosses tuiles**, et c'est tout. Pensé pour être
confié à une personne peu à l'aise avec l'informatique.

Construit avec **Tauri 2** (coquille native minuscule + webview du système) et un
front **TypeScript vanilla** sans framework.

## Pourquoi c'est léger et rapide

| Choix | Effet |
| --- | --- |
| Aucun framework front (pas de React/Vue) | bundle JS final ≈ **37 ko** |
| Aucun greffon Tauri externe | surface de code native minimale |
| `tauri` seul + `serde_json` | très peu de dépendances Rust |
| Icônes SVG locales, intégrées au bundle | zéro requête réseau, chargement instantané |
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

## Machine dédiée : kiosque plein écran (Debian + SDDM)

Pour la machine de destination, l'objectif est qu'on **ne voie jamais qu'il
s'agit d'une application** : la machine démarre, et le bureau simplifié est là,
plein écran, sans écran de connexion ni barre des tâches.

Tout est prêt dans le dossier **`deploy/`** :

```
deploy/
├─ install-kiosk.sh                 Installateur (à lancer sur le Debian)
├─ bureau-simplifie-session         Session Wayland via cage (kiosque)
├─ bureau-simplifie-x-session       Session X11 via matchbox (repli matériel)
├─ bureau-simplifie.desktop         Session Wayland pour SDDM
├─ bureau-simplifie-x.desktop       Session X11 pour SDDM
├─ sddm-10-bureau-simplifie.conf    Connexion automatique SDDM
├─ logind-10-bureau-simplifie.conf  Pas de mise en veille automatique
└─ bureau-simplifie.service         Variante sans gestionnaire de connexion
```

### Installation en une commande

Sur la machine Debian, après avoir récupéré le `.deb` produit par la CI :

```bash
cd deploy
sudo ./install-kiosk.sh mamie --with-apps --quiet-boot ~/bureau-simplifie_0.1.0_amd64.deb
```

(Remplacez `mamie` par le nom de la session utilisateur, et le chemin par le
vôtre.)

Ce que fait le script :

| Étape | Détail |
| --- | --- |
| Applications | `--with-apps` installe le navigateur, les mails, les photos, la musique, la calculatrice, le gestionnaire de fichiers et la numérisation, en accord avec les tuiles par défaut. |
| Session kiosque | `cage`, compositeur Wayland qui n'affiche **qu'une seule** application, toujours plein écran — ou `matchbox` en X11 (repli matériel, option `--x11`). |
| Connexion automatique | SDDM ouvre directement la session « Bureau Simplifié », sans écran de connexion. |
| Luminosité | `brightnessctl` : permet à la tuile *Paramètres* de régler le rétroéclairage, et ajoute l'utilisateur au groupe `video`. |
| Numérisation | `sane-utils` (commande `scanimage`) : c'est lui qui pilote le scanner depuis la tuile *Imprimante* ; l'utilisateur est ajouté au groupe `scanner`. |
| Polices | `fonts-noto-color-emoji` : utile pour les tuiles ajoutées avec un émoji (les tuiles par défaut, elles, utilisent des icônes SVG). |
| Démarrage silencieux | `--quiet-boot` masque GRUB et affiche un écran de démarrage à la place du défilé de messages. |
| Veille | La mise en veille automatique est désactivée : le bureau reste toujours visible. |

Options : `--x11`, `--with-apps`, `--quiet-boot`, `--no-sddm`, `--help`.

### Comment l'illusion tient

- **`cage`** ne sait afficher qu'une seule application : pas de barre des
  tâches, pas d'`Alt`+`Tab`, pas de fenêtre à déplacer. Impossible d'en sortir
  par inadvertance.
- La variable d'environnement **`BUREAU_SIMPLIFIE_KIOSK=1`**, posée par la
  session, active le mode verrouillé dès le démarrage — quoi qu'il y ait dans le
  fichier de réglages.
- Le **curseur disparaît** après quelques secondes d'inactivité.
- Aucune décoration de fenêtre, aucun menu contextuel.
- Le démarrage est silencieux de bout en bout (GRUB masqué, splash Plymouth,
  puis bascule directe vers l'application).

### Les portes de secours (à connaître !)

Un kiosque sans issue est un kiosque qu'on ne peut plus réparer. Trois sorties
existent, de la plus douce à la plus brutale :

1. **5 clics rapides sur l'heure** en haut à gauche → l'écran *Paramètres*
   s'ouvre (c'est volontairement discret). Le mode verrouillé y est alors
   **désactivé**, ce qui rétablit le cadre de fenêtre et le menu contextuel.
2. **`Ctrl` + `Maj` + `Q`** → une confirmation apparaît ; en acceptant,
   l'application se ferme et SDDM réaffiche son écran de connexion, d'où l'on
   peut ouvrir une session normale.
3. **Si l'écran est figé** : `Ctrl` + `Alt` + `F3` pour passer sur un autre
   terminal virtuel, se connecter, puis :

   ```bash
   sudo systemctl stop sddm      # ou : sudo pkill bureau-simplifie
   ```

### Tester avant de confier la machine

Redémarrez, puis :

1. `Ctrl` + `Alt` + `F3` : passer sur un autre terminal et se connecter.
2. Lancer la session à la main, pour voir d'éventuelles erreurs :

   ```bash
   /usr/local/bin/bureau-simplifie-session
   ```
3. Revenir à l'affichage principal avec `Ctrl` + `Alt` + `F1` (ou `F7`).

### Variante « zéro écran de connexion »

`deploy/bureau-simplifie.service` démarre le kiosque **sans aucun gestionnaire
de connexion** : c'est la méthode la plus indétectable, mais elle supprime la
porte de secours n°2 (plus d'écran de connexion ni de session de bureau où
revenir). À réserver au moment où tout fonctionne déjà ; les instructions sont
en commentaire en tête du fichier.

### Désinstaller le kiosque

```bash
sudo rm -f /etc/sddm.conf.d/10-bureau-simplifie.conf \
           /etc/systemd/logind.conf.d/10-bureau-simplifie.conf \
           /usr/local/bin/bureau-simplifie-session \
           /usr/local/bin/bureau-simplifie-x-session \
           /usr/share/wayland-sessions/bureau-simplifie.desktop \
           /usr/share/xsessions/bureau-simplifie-x.desktop
```

## Le mode kiosque dans l'application

Quand le mode kiosque est actif : plein écran, sans cadre, toujours au premier
plan, menu contextuel désactivé. Il est **imposé** sur une machine dédiée par la
variable d'environnement `BUREAU_SIMPLIFIE_KIOSK` et n'est plus réglable depuis
*Paramètres* (pour éviter qu'on le désactive par erreur) : il se désactive
automatiquement dès qu'on emprunte une porte de secours.

Pour en sortir : **5 clics rapides sur l'heure** en haut à gauche, ou
`Ctrl` + `Maj` + `Q` pour quitter complètement.

## Personnalisation

L'écran **Paramètres** (tuile du même nom) se veut volontairement minimal. Il ne
contient que trois réglages, ceux dont on se sert vraiment :

- **Luminosité** de l'écran (via `brightnessctl`) — la ligne est masquée
  automatiquement si l'écran n'a pas de rétroéclairage réglable (moniteur
  externe). L'utilisateur doit appartenir au groupe `video` (l'installateur s'en
  charge).
- **Volume** sonore.
- **Ville** utilisée pour la météo.

Le reste (taille du texte, thème, verrouillage, édition des tuiles) n'est plus
exposé dans l'interface. Les tuiles par défaut — quatre seulement : Internet, Mes
mails, Imprimante, Paramètres — sont définies dans `src/defaults.ts` ; pour les
modifier, on édite ce fichier (ou `~/.config/fr.bureau.simplifie/settings.json`).

- Les commandes de numérisation / impression sont regroupées dans
  `src/system-commands.ts` (utile selon la distribution : `simple-scan`,
  `xsane`, `skanlite`…).
- Les réglages de l'utilisateur sont enregistrés dans
  `~/.config/fr.bureau.simplifie/settings.json`. En cas de problème, supprimer
  ce fichier restaure les valeurs par défaut.

## La tuile « Imprimante » : numérisation

La tuile **Imprimante** ne lance pas un logiciel externe : elle ouvre un écran
de numérisation intégré, en pleine page (comme les Paramètres). On y trouve :

- **Numériser** : lance le scanner et affiche l'aperçu du document ;
- **l'aperçu** : l'image du document tel qu'il a été scanné ;
- **Télécharger** : enregistre le document dans `~/Images/Numérisations/`
  (nommé `numérisation-<date>.jpg`) ;
- la **croix** en haut à droite pour revenir au bureau.

Côté natif, deux commandes Rust s'en chargent : `scan_document` (appelle
`scanimage`, essaie plusieurs formats/résolutions, renvoie l'aperçu encodé) et
`save_scan` (recopie le document vers le dossier Images). Aucun greffon : ni
dépendance supplémentaire, ni bibliothèque externe.

Sous Linux uniquement ; dans un navigateur, l'écran est simulé pour pouvoir
mettre au point l'interface.

Des commandes de repli (`simple-scan`, `xsane`, `skanlite`) restent définies
dans `src/system-commands.ts` si l'on préfère un jour ouvrir un logiciel
externe.

## Direction artistique : elementary OS

L'interface reprend la **palette et les codes visuels d'[elementary OS](https://elementary.io)** :
cartes blanches à coins arrondis, ombres douces, accent **Blueberry** `#3689e6`,
typographie légère pour l'heure.

Les **contrôles** (boutons *et* champs de saisie) partagent une même forme :
même rayon (`--control-radius`) et même liseré `#adadad`. Les boutons reprennent
le style « classique » d'elementary — dégradé vertical clair (`#ffffff` →
`#e6e6e6`), reflet intérieur, états survol / appui discrets ; les champs ont un
fond uni blanc et un léger creux intérieur. Les couleurs sont redéfinies pour
chaque thème (dans `:root`, `[data-theme="sombre"]` et
`[data-theme="contraste"]`). Les *tuiles*, elles, restent des cartes blanches à
plus grands angles : ce sont les applications, pas des boutons.

Les icônes des tuiles et de la météo proviennent des projets
[`elementary/icons`](https://github.com/elementary/icons) et
[`elementary/mail`](https://github.com/elementary/mail) (voir
`src/assets/icons/NOTICE.md`). Attention : elles sont sous licence
**GPL-3.0-or-later**, une licence *copyleft* — à prendre en compte si
l'application est un jour distribuée publiquement.

## Structure du projet

```
.
├─ index.html                  Page hôte de l'interface
├─ src/
│  ├─ main.ts                  Point d'entrée : état, horloge, météo, rendu
│  ├─ ipc.ts                   Pont vers le natif (+ repli navigateur)
│  ├─ icons.ts                 Icônes elementary des tuiles et de la météo
│  ├─ types.ts                 Types partagés
│  ├─ defaults.ts              Raccourcis et réglages par défaut
│  ├─ system-commands.ts       Commandes système (numérisation, impression…)
│  ├─ style.css                Styles (palette elementary OS)
│  ├─ assets/icons/            Icônes SVG (voir NOTICE.md pour la licence)
│  └─ modules/
│     ├─ launcher.ts           Grille des tuiles
│     ├─ clock.ts              Horloge et date
│     ├─ weather.ts            Météo Open-Meteo
│     ├─ actions.ts            Exécution des tuiles (applications, sites, actions)
│     ├─ settings-panel.ts     Écran « Paramètres »
│     ├─ scan-panel.ts         Écran de numérisation (tuile Imprimante)
│     ├─ overlay.ts            Pleine page générique (Paramètres, numérisation)
│     └─ toast.ts              Messages en bas d'écran
├─ src-tauri/                  Coquille native Rust
│  ├─ src/lib.rs               Commandes natives
│  ├─ src/main.rs
│  ├─ tauri.conf.json          Configuration de l'application
│  ├─ capabilities/default.json
│  ├─ Cargo.toml
│  └─ icons/                   Icônes (générées depuis app-icon.svg)
├─ deploy/                     Déploiement kiosque Debian + SDDM
│  ├─ install-kiosk.sh         Installateur (à lancer sur la machine cible)
│  ├─ bureau-simplifie-session Session Wayland (cage)
│  ├─ bureau-simplifie-x-session       Session X11 (matchbox)
│  ├─ *.desktop                Sessions pour SDDM
│  ├─ sddm-*.conf              Connexion automatique
│  ├─ logind-*.conf            Pas de veille automatique
│  └─ bureau-simplifie.service Variante sans gestionnaire de connexion
└─ .github/workflows/build.yml Compilation Linux/Windows
```

## Notes de sécurité

Les commandes natives (`launch_app`, `system_run`) exécutent des programmes
arbitraires : c'est **nécessaire** pour un lanceur d'applications, mais cela
signifie qu'un raccourci mal saisi peut lancer n'importe quoi. Les URL ouvertes
sont, elles, limitées aux schémas `http` et `https`. Gardez cette application
sur un compte utilisateur dédié, sans droits particuliers.
