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
4. publie les paquets dans les *artifacts* du workflow ;
5. **à chaque `push` sur `main`, crée une version publiée** (*GitHub Release*),
   étiquetée `v0.1.<numéro de construction>`, avec le `.deb` en pièce jointe.

> Le numéro de version est calculé automatiquement : la partie `majeure.mineure`
> vient de `tauri.conf.json`, la dernière partie est le numéro de construction
> GitHub. Pousser sur `main` suffit donc à publier une nouvelle version ; les
> tags `vX.Y.Z` restent possibles pour fixer soi-même la version.

Pour l'activer :

```bash
git init
git add -A
git commit -m "Bureau simplifié : première version"
git branch -M main
git remote add origin https://github.com/Ano21Nymous/bureau-simplifie.git
git push -u origin main
```

L'onglet **Actions** produit alors les paquets, et l'onglet **Releases** de
GitHub liste les versions publiées, chacune avec son `.deb`. C'est cette liste
que consultent les machines pour se mettre à jour (voir la section suivante).

## Installer sur l'ordinateur de destination (Linux)

Depuis la page **Releases**
(<https://github.com/Ano21Nymous/bureau-simplifie/releases>), téléchargez le
`.deb` de la dernière version, puis installez-le :

```bash
# exemple : version 0.1.1
wget https://github.com/Ano21Nymous/bureau-simplifie/releases/download/v0.1.1/bureau-simplifie_0.1.1_amd64.deb
sudo apt install -y ./bureau-simplifie_0.1.1_amd64.deb
```

Ou, sans rien installer, le `.AppImage` — disponible dans les *artifacts* du
workflow (onglet **Actions** → dernière exécution → `paquets-linux`) :

```bash
chmod +x "Bureau Simplifie_0.1.1_amd64.AppImage"
./"Bureau Simplifie_0.1.1_amd64.AppImage"
```

> **Pourquoi le paquet s'appelle `bureau-simplifie`** et non « Bureau Simplifié » ?
> Un nom de paquet Debian ne peut contenir que `a-z`, `0-9`, `+`, `-` et `.`.
> Un accent ferait produire à Tauri un paquet… qui refuse de s'installer
> (bogue connu : [tauri#14366](https://github.com/tauri-apps/tauri/issues/14366)).
> Le `productName` de `src-tauri/tauri.conf.json` est donc écrit **sans accent**,
> et la CI renomme l'archive en `bureau-simplifie_<version>_amd64.deb`. Le nom
> *affiché*, lui, reste bien « Bureau Simplifié » (titre de fenêtre, session
> kiosque, menu des applications).

## Machine dédiée : kiosque plein écran (Debian + SDDM)

Pour la machine de destination, l'objectif est qu'on **ne voie jamais qu'il
s'agit d'une application** : la machine démarre, et le bureau simplifié est là,
plein écran, sans écran de connexion ni barre des tâches.

Tout est prêt dans le dossier **`deploy/`** :

```
deploy/
├─ install-kiosk.sh                 Installateur (à lancer sur le Debian)
├─ bureau-simplifie-maj             Vérification / mise à jour automatique
├─ bureau-simplifie-maj.service     Service systemd (au démarrage)
├─ definir-version.mjs              Écrit la version dans les fichiers (CI)
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
| Fenêtres des applis | Firefox et Thunderbird gardent une barre de titre réduite à une **seule croix de fermeture** (pas de bouton « réduire » ni « agrandir »), pour qu'on ne puisse jamais perdre la fenêtre. L'application réapplique ce réglage à chaque démarrage en mode kiosque. |
| Connexion automatique | SDDM ouvre directement la session « Bureau Simplifié », sans écran de connexion. |
| Luminosité | `brightnessctl` : permet à la tuile *Paramètres* de régler le rétroéclairage, et ajoute l'utilisateur au groupe `video`. |
| Numérisation | `sane-utils` (commande `scanimage`) : c'est lui qui pilote le scanner depuis la tuile *Imprimante* ; l'utilisateur est ajouté au groupe `scanner`. |
| Polices | `fonts-noto-color-emoji` : utile pour les tuiles ajoutées avec un émoji (les tuiles par défaut, elles, utilisent des icônes SVG). |
| Démarrage silencieux | `--quiet-boot` masque GRUB et affiche un écran de démarrage à la place du défilé de messages. |
| Veille | La mise en veille automatique est désactivée : le bureau reste toujours visible. |
| Mises à jour | `curl` + `ca-certificates` : la machine vérifie et installe les nouvelles versions au démarrage (voir *Mises à jour automatiques*). |

Options : `--x11`, `--with-apps`, `--quiet-boot`, `--no-sddm`,
`--depot <propriétaire>/<nom>`, `--sans-maj`, `--help`.

### Comment l'illusion tient

- **`cage`** ne sait afficher qu'une seule application : pas de barre des
  tâches, pas d'`Alt`+`Tab`, pas de fenêtre à déplacer. Impossible d'en sortir
  par inadvertance.
- La variable d'environnement **`BUREAU_SIMPLIFIE_KIOSK=1`**, posée par la
  session, active le mode verrouillé dès le démarrage — quoi qu'il y ait dans le
  fichier de réglages.
- Le **curseur disparaît** après quelques secondes d'inactivité.
- Notre fenêtre n'a aucune décoration ; les applications lancées (Firefox,
  Thunderbird) n'en gardent qu'une seule, une **croix de fermeture**. Aucun menu
  contextuel.
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
sudo systemctl disable --now bureau-simplifie-maj.service
sudo rm -f /etc/sddm.conf.d/10-bureau-simplifie.conf \
           /etc/systemd/logind.conf.d/10-bureau-simplifie.conf \
           /etc/systemd/system/bureau-simplifie-maj.service \
           /etc/bureau-simplifie/maj.conf \
           /usr/local/bin/bureau-simplifie-session \
           /usr/local/bin/bureau-simplifie-x-session \
           /usr/local/bin/bureau-simplifie-maj \
           /usr/share/wayland-sessions/bureau-simplifie.desktop \
           /usr/share/xsessions/bureau-simplifie-x.desktop
sudo systemctl daemon-reload
```

La configuration qui réduit la barre de titre de Firefox et Thunderbird vit
dans le `settings.ini` de l'utilisateur (clé `gtk-decoration-layout`). Pour
revenir à des fenêtres classiques, supprimez cette clé ; l'application la repose
au démarrage suivant tant que le mode kiosque est actif.

## Mises à jour automatiques

Objectif : **pousser sur GitHub, et la machine de mamie se met à jour toute
seule** au démarrage suivant. Aucune manipulation de sa part, aucune invitation
à cliquer, rien à répondre.

Le principe est volontairement simple, et n'ajoute **aucune dépendance à
l'application** (pas de greffon Tauri, pas de bibliothèque) :

1. **Côté développement** : chaque `push` sur `main` déclenche la CI, qui
   construit le `.deb` et crée une version publiée `v0.1.<n>` (voir plus haut).
2. **Côté machine** : le service `bureau-simplifie-maj.service` s'exécute au
   démarrage, **avant la session graphique** (donc l'application démarre
   directement dans la bonne version). Il :

   - lit la version installée (`dpkg-query`) ;
   - interroge la dernière version publiée sur GitHub ;
   - les compare (`dpkg --compare-versions`) ;
   - si la version publiée est plus récente, télécharge son `.deb`, vérifie qu'il
     s'agit bien du bon paquet, puis l'installe ;
   - dépose alors un marqueur, que l'application lit au démarrage pour afficher
     « Votre système a été mis à jour. ».

Le script `deploy/bureau-simplifie-maj` est celui qui travaille ; il est
utilisable à la main :

```bash
sudo bureau-simplifie-maj              # vérifier et mettre à jour maintenant
journalctl -u bureau-simplifie-maj     # voir ce qui s'est passé au démarrage
```

### Configuration

Tout tient dans **`/etc/bureau-simplifie/maj.conf`** :

```sh
DEPOT="Ano21Nymous/bureau-simplifie"   # dépôt GitHub (propriétaire/nom)
PAQUET="bureau-simplifie"       # nom du paquet Debian
ACTIVER=1                       # 1 = mises à jour automatiques, 0 = non
```

- L'installateur **déduit `DEPOT` tout seul** : l'adresse du dépôt est gravée
  dans le `.deb` au moment de la construction (champ `Homepage`), et relue à
  l'installation. On peut la forcer avec `--depot <propriétaire>/<nom>`.
  (En construction locale, hors CI, c'est la valeur de `bundle.homepage` dans
  `src-tauri/tauri.conf.json` qui est utilisée ; elle vaut déjà
  `https://github.com/Ano21Nymous/bureau-simplifie`.)
- `--sans-maj` installe le reste sans activer les mises à jour (équivaut à
  `ACTIVER=0`).
- `ACTIVER=0` est un **verrou administrateur** : plus aucune vérification n'a
  lieu. C'est le seul moyen de couper les mises à jour ; il n'y a **pas de
  réglage côté utilisateur** (les mises à jour se font à chaque démarrage).
- Après une mise à jour réussie, le programme dépose la nouvelle version dans
  `/var/lib/bureau-simplifie/maj-ok`. Au démarrage suivant, l'application lit ce
  marqueur et affiche **une seule fois** une petite fenêtre « Votre système a été
  mis à jour. » avec un bouton *OK*. La version déjà annoncée est mémorisée dans
  le champ `majVersionVue` des réglages, pour ne pas répéter le message.

> **Sécurité** : la mise à jour n'installe que des `.deb` provenant du dépôt
> configuré, et vérifie le nom du paquet avant d'installer. Elle se fait en
> HTTPS. Comme pour toute mise à jour automatique, gardez la main sur ce que
> vous publiez sur `main` : c'est ce qui partira sur la machine.
>
> **Pas de réseau ?** La vérification échoue proprement : la machine démarre
> normalement sur sa version actuelle, et réessaiera au prochain démarrage.
>
> **Portée** : seuls le paquet de l'application voyagent ainsi. Les scripts de
> session et l'installateur (dossier `deploy/`) ne sont pas concernés : si vous
> les modifiez, relancez `install-kiosk.sh` sur la machine.

## Le mode kiosque dans l'application

Quand le mode kiosque est actif : plein écran, sans cadre, menu contextuel
désactivé. Il est **imposé** sur une machine dédiée par la
variable d'environnement `BUREAU_SIMPLIFIE_KIOSK` et n'est plus réglable depuis
*Paramètres* (pour éviter qu'on le désactive par erreur) : il se désactive
automatiquement dès qu'on emprunte une porte de secours.

Pour en sortir : **5 clics rapides sur l'heure** en haut à gauche, ou
`Ctrl` + `Maj` + `Q` pour quitter complètement.

## Personnalisation

L'écran **Paramètres** (tuile du même nom) se veut volontairement minimal. Il ne
contient que les réglages dont on se sert vraiment :

- **Luminosité** de l'écran (via `brightnessctl`) — la ligne est masquée
  automatiquement si l'écran n'a pas de rétroéclairage réglable (moniteur
  externe). L'utilisateur doit appartenir au groupe `video` (l'installateur s'en
  charge).
- **Volume** sonore.
- **Ville** utilisée pour la météo.
- **Version** installée du bureau, affichée en lecture seule (dernière ligne).

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
│  ├─ bureau-simplifie-maj     Vérification / mise à jour au démarrage
│  ├─ bureau-simplifie-maj.service      Service systemd associé
│  ├─ definir-version.mjs      Écrit la version dans les fichiers (CI)
│  ├─ bureau-simplifie-session Session Wayland (cage)
│  ├─ bureau-simplifie-x-session       Session X11 (matchbox)
│  ├─ *.desktop                Sessions pour SDDM
│  ├─ sddm-*.conf              Connexion automatique
│  ├─ logind-*.conf            Pas de veille automatique
│  └─ bureau-simplifie.service Variante sans gestionnaire de connexion
└─ .github/workflows/build.yml Compilation + publication d'une version
```

## Notes de sécurité

Les commandes natives (`launch_app`, `system_run`) exécutent des programmes
arbitraires : c'est **nécessaire** pour un lanceur d'applications, mais cela
signifie qu'un raccourci mal saisi peut lancer n'importe quoi. Les URL ouvertes
sont, elles, limitées aux schémas `http` et `https`. Gardez cette application
sur un compte utilisateur dédié, sans droits particuliers.
