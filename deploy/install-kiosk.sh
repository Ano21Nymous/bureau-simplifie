#!/usr/bin/env bash
#
# Bureau Simplifié — installation en kiosque plein écran sur Debian + SDDM.
#
# À lancer SUR la machine Debian, en root :
#
#   sudo ./install-kiosk.sh [options] [utilisateur] [chemin/vers/bureau-simplifie.deb]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="wayland"
USE_SDDM=1
QUIET_BOOT=0
WITH_APPS=0
MAJ_ACTIVE=1
KIOSK_USER=""
DEB_PATH=""
DEPOT=""
APP_BIN="/usr/bin/bureau-simplifie"

# --------------------------------------------------------------------------- #
#  Affichage
# --------------------------------------------------------------------------- #
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m ok\033[0m  %s\n' "$*"; }
warn() { printf '\033[1;33m/!\\\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mErreur :\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Bureau Simplifié — installation en kiosque plein écran sur Debian + SDDM.

Usage :
  sudo ./install-kiosk.sh [options] [utilisateur] [chemin/vers/bureau-simplifie.deb]

Options :
  --x11         Kiosque X11 (matchbox) au lieu de Wayland (cage).
                Utile si le matériel est ancien ou capricieux.
  --wayland     Kiosque Wayland via cage (par défaut).
  --with-apps   Installer les applications de base des tuiles par défaut
                (navigateur, mails, photos, musique, calculatrice, fichiers,
                numérisation). Recommandé pour une machine dédiée.
  --no-sddm     Ne pas toucher à SDDM (kiosque lancé autrement).
  --quiet-boot  Démarrage silencieux : GRUB masqué + splash Plymouth.
  --depot OWNER/NOM
                Dépôt GitHub d'où proviennent les mises à jour automatiques
                (par défaut : déduit de l'application installée).
  --sans-maj    Ne pas mettre à jour l'application automatiquement au
                démarrage. (Par défaut, chaque démarrage vérifie et installe
                la dernière version publiée.)
  -h, --help    Affiche cette aide.

Exemples :
  sudo ./install-kiosk.sh mamie --with-apps --quiet-boot
  sudo ./install-kiosk.sh mamie ~/Téléchargements/bureau-simplifie_0.1.0_amd64.deb
  sudo ./install-kiosk.sh mamie --x11 --with-apps
EOF
}

# --------------------------------------------------------------------------- #
#  Arguments
# --------------------------------------------------------------------------- #
while [ $# -gt 0 ]; do
  case "$1" in
    --x11)        MODE="x11" ;;
    --wayland)    MODE="wayland" ;;
    --with-apps)  WITH_APPS=1 ;;
    --no-sddm)    USE_SDDM=0 ;;
    --quiet-boot) QUIET_BOOT=1 ;;
    --sans-maj)   MAJ_ACTIVE=0 ;;
    --depot)
      [ $# -ge 2 ] || die "--depot attend un argument (OWNER/NOM)"
      DEPOT="$2"
      shift
      ;;
    -h|--help)    usage; exit 0 ;;
    --)           shift; break ;;
    -*)           die "option inconnue : $1" ;;
    *)
      if [ -z "$KIOSK_USER" ]; then
        KIOSK_USER="$1"
      elif [ -z "$DEB_PATH" ]; then
        DEB_PATH="$1"
      else
        die "argument en trop : $1"
      fi
      ;;
  esac
  shift
done

# --------------------------------------------------------------------------- #
#  Vérifications
# --------------------------------------------------------------------------- #
[ "$(id -u)" -eq 0 ] || die "à lancer avec sudo, par exemple : sudo $0 ${SUDO_USER:-mamie}"
command -v apt-get >/dev/null 2>&1 || die "ce script vise Debian/Ubuntu (apt-get introuvable)"

if [ -z "$KIOSK_USER" ]; then
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    KIOSK_USER="$SUDO_USER"
  else
    KIOSK_USER="$(getent passwd | awk -F: '$3 >= 1000 && $3 < 65534 { print $1; exit }')"
  fi
fi
[ -n "$KIOSK_USER" ] || die "impossible de deviner l'utilisateur, passez-le en argument"
id "$KIOSK_USER" >/dev/null 2>&1 || die "utilisateur inconnu : $KIOSK_USER"

if [ "$MODE" = "wayland" ]; then
  SESSION_ID="bureau-simplifie"
else
  SESSION_ID="bureau-simplifie-x"
fi

# apt n'accepte un fichier local que s'il ressemble à un chemin.
if [ -n "$DEB_PATH" ]; then
  case "$DEB_PATH" in
    /*|./*|../*|*/*) ;;
    *) DEB_PATH="./$DEB_PATH" ;;
  esac
fi

log "Utilisateur du kiosque : $KIOSK_USER"
log "Mode d'affichage       : $MODE (session « $SESSION_ID »)"

# --------------------------------------------------------------------------- #
#  Index des paquets (avant toute installation)
# --------------------------------------------------------------------------- #
log "Mise à jour de la liste des paquets"
apt-get update

# Sans cette présélection, l'installation de SDDM ouvre une question
# interactive sur le gestionnaire de connexion par défaut.
echo "sddm shared/default-x-display-manager select sddm" | debconf-set-selections

# --------------------------------------------------------------------------- #
#  Application
# --------------------------------------------------------------------------- #
if [ -n "$DEB_PATH" ]; then
  [ -f "$DEB_PATH" ] || die "fichier introuvable : $DEB_PATH"
  log "Installation du paquet $(basename "$DEB_PATH")"
  DEBIAN_FRONTEND=noninteractive apt-get install -y "$DEB_PATH"
fi

if [ -x "$APP_BIN" ]; then
  ok "application trouvée : $APP_BIN"
else
  warn "l'application est absente de $APP_BIN."
  warn "Installez-la (apt install ./bureau-simplifie_x.y.z_amd64.deb) puis relancez ce script,"
  warn "ou passez directement le chemin du .deb en argument."
fi

# --------------------------------------------------------------------------- #
#  Dépendances système
# --------------------------------------------------------------------------- #
# `brightnessctl` permet à la tuile « Paramètres » de régler la luminosité ;
# son paquet udev autorise le groupe `video` à écrire dans /sys/class/backlight.
# `sane-utils` fournit `scanimage`, utilisé par la tuile « Imprimante ».
# `curl` + `ca-certificates` servent à la mise à jour automatique.
# `fonts-noto-color-emoji` reste utile pour les tuiles ajoutées avec un émoji.
PACKAGES="brightnessctl sane-utils curl ca-certificates fonts-noto-color-emoji xdg-utils"

if [ "$MODE" = "wayland" ]; then
  PACKAGES="$PACKAGES cage"
else
  PACKAGES="$PACKAGES matchbox-window-manager unclutter x11-xserver-utils xinit"
fi

if [ "$USE_SDDM" -eq 1 ]; then
  PACKAGES="$PACKAGES sddm"
fi

if [ "$QUIET_BOOT" -eq 1 ]; then
  PACKAGES="$PACKAGES plymouth plymouth-themes"
fi

if [ "$WITH_APPS" -eq 1 ]; then
  # Jeu cohérent avec les tuiles par défaut de l'application (src/defaults.ts).
  PACKAGES="$PACKAGES firefox-esr thunderbird pcmanfm audacious galculator simple-scan"
fi

log "Installation des paquets : $PACKAGES"
# shellcheck disable=SC2086
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $PACKAGES
ok "dépendances en place"

# Accès aux périphériques : « video » (luminosité), « scanner » (scanner USB),
# « render » (GPU, utile pour cage). Chaque groupe est ajouté séparément : si
# l'un n'existe pas, les autres sont quand même appliqués.
for group in video scanner render; do
  if getent group "$group" >/dev/null 2>&1; then
    usermod -aG "$group" "$KIOSK_USER" 2>/dev/null || true
  fi
done

# La police d'émojis est indispensable : les tuiles s'affichent sinon en
# petits carrés vides, ce qui casse complètement l'illusion.
if command -v fc-list >/dev/null 2>&1 && ! fc-list | grep -qi emoji; then
  warn "aucune police emoji détectée. Installez fonts-noto-color-emoji, sinon"
  warn "les icônes des tuiles apparaîtront sous forme de carrés."
fi

# Sans environnement de bureau, « xdg-open » choisit son navigateur via
# l'alternative « x-www-browser » : on la renseigne si possible.
for browser in firefox-esr firefox chromium midori epiphany-browser; do
  if [ -x "/usr/bin/$browser" ]; then
    update-alternatives --set x-www-browser "/usr/bin/$browser" >/dev/null 2>&1 || true
    ok "navigateur par défaut : $browser"
    break
  fi
done

# Applications citées par les tuiles par défaut : on signale les absences
# plutôt que de les installer en silence.
while read -r program label; do
  [ -n "$program" ] || continue
  if ! command -v "$program" >/dev/null 2>&1; then
    warn "« $label » : l'application « $program » n'est pas installée (relancez avec --with-apps)"
  fi
done <<'APPS'
thunderbird Mes mails
pcmanfm Mes photos / Mes fichiers
audacious Ma musique
galculator Calculatrice
simple-scan Numériser
APPS

# --------------------------------------------------------------------------- #
#  Scripts et sessions
# --------------------------------------------------------------------------- #
log "Installation des scripts de session dans /usr/local/bin"
install -m 0755 "$SCRIPT_DIR/bureau-simplifie-session"   /usr/local/bin/bureau-simplifie-session
install -m 0755 "$SCRIPT_DIR/bureau-simplifie-x-session" /usr/local/bin/bureau-simplifie-x-session

install -d /usr/share/wayland-sessions
install -d /usr/share/xsessions
install -m 0644 "$SCRIPT_DIR/bureau-simplifie.desktop"   /usr/share/wayland-sessions/bureau-simplifie.desktop
install -m 0644 "$SCRIPT_DIR/bureau-simplifie-x.desktop" /usr/share/xsessions/bureau-simplifie-x.desktop
ok "sessions installées (wayland-sessions + xsessions)"

# --------------------------------------------------------------------------- #
#  Barre de titre des applications externes (Firefox, Thunderbird)
# --------------------------------------------------------------------------- #
# Sous cage (Wayland), le compositeur ne fournit aucune décoration : chaque
# application dessine donc la sienne. Pour que l'on garde un moyen évident de
# fermer Firefox et Thunderbird — sans bouton « réduire » qui ferait perdre la
# fenêtre — on réduit cette barre de titre à une seule croix de fermeture.
log "Réduction de la barre de titre à un simple bouton fermer"
KIOSK_HOME="$(getent passwd "$KIOSK_USER" 2>/dev/null | cut -d: -f6)"
[ -n "$KIOSK_HOME" ] || KIOSK_HOME="/home/$KIOSK_USER"

for gtk in gtk-3.0 gtk-4.0; do
  cfg="$KIOSK_HOME/.config/$gtk/settings.ini"
  install -d -o "$KIOSK_USER" -g "$KIOSK_USER" "$KIOSK_HOME/.config/$gtk" 2>/dev/null \
    || install -d "$KIOSK_HOME/.config/$gtk"

  if [ -f "$cfg" ] && grep -qE '^[[:space:]]*gtk-decoration-layout[[:space:]]*=' "$cfg"; then
    # La clé existe déjà : on la met à jour.
    sed -i -E 's|^[[:space:]]*gtk-decoration-layout[[:space:]]*=.*|gtk-decoration-layout=:close|' "$cfg"
  elif [ -s "$cfg" ] && grep -qE '^\[Settings\]' "$cfg"; then
    printf 'gtk-decoration-layout=:close\n' >> "$cfg"
  elif [ -s "$cfg" ]; then
    printf '\n[Settings]\ngtk-decoration-layout=:close\n' >> "$cfg"
  else
    printf '[Settings]\ngtk-decoration-layout=:close\n' > "$cfg"
  fi

  chown "$KIOSK_USER:$KIOSK_USER" "$cfg" 2>/dev/null || true
  chmod 0644 "$cfg" 2>/dev/null || true
done
ok "Firefox et Thunderbird afficheront une croix de fermeture unique"

# --------------------------------------------------------------------------- #
#  SDDM
# --------------------------------------------------------------------------- #
if [ "$USE_SDDM" -eq 1 ]; then
  log "Configuration de la connexion automatique SDDM"

  install -d /etc/sddm.conf.d
  sed -e "s/^User=UTILISATEUR/User=$KIOSK_USER/" \
      -e "s/^Session=bureau-simplifie$/Session=$SESSION_ID/" \
      "$SCRIPT_DIR/sddm-10-bureau-simplifie.conf" \
      > /etc/sddm.conf.d/10-bureau-simplifie.conf
  ok "/etc/sddm.conf.d/10-bureau-simplifie.conf écrit"

  # Un seul gestionnaire de connexion à la fois.
  for other in gdm3 lightdm lxdm xdm; do
    if systemctl -q is-enabled "$other" 2>/dev/null; then
      warn "$other était actif : désactivation (prend effet au redémarrage)"
      systemctl disable "$other" >/dev/null 2>&1 || true
    fi
  done

  systemctl enable sddm >/dev/null 2>&1 || warn "« systemctl enable sddm » a échoué"
  systemctl set-default graphical.target >/dev/null 2>&1 || true
  ok "SDDM sera le gestionnaire de connexion au prochain démarrage"
else
  log "--no-sddm : SDDM n'est pas modifié"
fi

# --------------------------------------------------------------------------- #
#  Pas de mise en veille automatique
# --------------------------------------------------------------------------- #
log "Désactivation de la mise en veille automatique"
install -d /etc/systemd/logind.conf.d
install -m 0644 "$SCRIPT_DIR/logind-10-bureau-simplifie.conf" \
  /etc/systemd/logind.conf.d/10-bureau-simplifie.conf
ok "réglage enregistré (appliqué au prochain démarrage)"

# --------------------------------------------------------------------------- #
#  Démarrage silencieux
# --------------------------------------------------------------------------- #
if [ "$QUIET_BOOT" -eq 1 ]; then
  log "Configuration du démarrage silencieux (GRUB + Plymouth)"

  if [ -f /etc/default/grub ]; then
    cp /etc/default/grub /etc/default/grub.bak.bureau-simplifie

    if grep -q '^GRUB_TIMEOUT=' /etc/default/grub; then
      sed -i 's/^GRUB_TIMEOUT=.*/GRUB_TIMEOUT=0/' /etc/default/grub
    else
      echo 'GRUB_TIMEOUT=0' >> /etc/default/grub
    fi

    if grep -q '^GRUB_TIMEOUT_STYLE=' /etc/default/grub; then
      sed -i 's/^GRUB_TIMEOUT_STYLE=.*/GRUB_TIMEOUT_STYLE=hidden/' /etc/default/grub
    else
      echo 'GRUB_TIMEOUT_STYLE=hidden' >> /etc/default/grub
    fi

    CMDLINE='GRUB_CMDLINE_LINUX_DEFAULT="quiet splash loglevel=3 vt.global_cursor_default=0"'
    if grep -q '^GRUB_CMDLINE_LINUX_DEFAULT=' /etc/default/grub; then
      sed -i "s|^GRUB_CMDLINE_LINUX_DEFAULT=.*|$CMDLINE|" /etc/default/grub
    else
      echo "$CMDLINE" >> /etc/default/grub
    fi

    update-grub >/dev/null 2>&1 || warn "« update-grub » a échoué"
    ok "GRUB configuré (sauvegarde : /etc/default/grub.bak.bureau-simplifie)"
  else
    warn "/etc/default/grub introuvable : GRUB non modifié"
  fi

  if command -v plymouth-set-default-theme >/dev/null 2>&1; then
    plymouth-set-default-theme -R bgrt 2>/dev/null \
      || plymouth-set-default-theme -R details 2>/dev/null \
      || warn "thème Plymouth non appliqué"
    ok "splash Plymouth configuré"
  fi
fi

# --------------------------------------------------------------------------- #
#  Mise à jour automatique
# --------------------------------------------------------------------------- #
MAJ_CONF_DIR="/etc/bureau-simplifie"

# Dépôt d'où proviennent les mises à jour. Par défaut, on le déduit de
# l'adresse « homepage » gravée dans le paquet au moment de la construction
# (la CI y met l'adresse du dépôt GitHub).
if [ -z "$DEPOT" ]; then
  HOMEPAGE="$(dpkg-query -W -f='${Homepage}' bureau-simplifie 2>/dev/null || true)"
  case "$HOMEPAGE" in
    https://github.com/*) DEPOT="${HOMEPAGE#https://github.com/}" ;;
    http://github.com/*)  DEPOT="${HOMEPAGE#http://github.com/}" ;;
  esac
fi
# Nettoyage : « / » final ou « .git » éventuels.
DEPOT="${DEPOT%/}"
DEPOT="${DEPOT%.git}"
# Adresse de remplissage de tauri.conf.json (paquet construit hors CI) :
# inutile d'essayer de la joindre.
case "$DEPOT" in
  VOTRE-COMPTE/*) DEPOT="" ;;
esac

log "Installation de la mise à jour automatique"
install -m 0755 "$SCRIPT_DIR/bureau-simplifie-maj" /usr/local/bin/bureau-simplifie-maj
install -d "$MAJ_CONF_DIR"
# Dossier où le programme de mise à jour dépose, après une mise à jour réussie,
# le marqueur que l'application lit au démarrage (fenêtre « système à jour »).
install -d -m 0755 /var/lib/bureau-simplifie
cat > "$MAJ_CONF_DIR/maj.conf" <<CONF
# Dépôt GitHub d'où proviennent les mises à jour (« propriétaire/nom »).
DEPOT="$DEPOT"
# Nom du paquet Debian installé.
PAQUET="bureau-simplifie"
# Mise à jour automatique au démarrage : 1 = oui, 0 = non.
# (Réglé ici par l'option --sans-maj ; modifiable ensuite dans ce fichier.)
ACTIVER=$MAJ_ACTIVE
CONF
install -m 0644 "$SCRIPT_DIR/bureau-simplifie-maj.service" \
  /etc/systemd/system/bureau-simplifie-maj.service

if systemctl daemon-reload 2>/dev/null \
   && systemctl enable bureau-simplifie-maj.service >/dev/null 2>&1; then
  ok "mise à jour automatique activée au démarrage"
else
  warn "« systemctl enable bureau-simplifie-maj.service » a échoué"
fi

if [ "$MAJ_ACTIVE" -eq 1 ] && [ -z "$DEPOT" ]; then
  warn "aucun dépôt de mise à jour connu : renseignez DEPOT dans"
  warn "  $MAJ_CONF_DIR/maj.conf"
  warn "ou relancez ce script avec : --depot proprietaire/nom-du-depot"
fi

# --------------------------------------------------------------------------- #
#  Résumé
# --------------------------------------------------------------------------- #
cat <<EOF

────────────────────────────────────────────────────────────────────────
 Installation terminée.

 Utilisateur    : $KIOSK_USER
 Mode           : $MODE
 Application    : $APP_BIN
 Mises à jour   : $([ "$MAJ_ACTIVE" -eq 1 ] && [ -n "$DEPOT" ] && echo "automatiques depuis $DEPOT" || echo "désactivées")

 AU PROCHAIN REDÉMARRAGE, la machine ouvrira directement le Bureau
 Simplifié, plein écran, sans écran de connexion.

 FENÊTRES (Firefox, Thunderbird) :
   une seule croix de fermeture, pas de bouton « réduire ». Ce réglage est
   posé maintenant, et l'application le réapplique à chaque démarrage.

 AVANT de redémarrer, testez sans risque :
   1. Ctrl+Alt+F3                (passer sur un autre terminal virtuel)
   2. se connecter en tant que $KIOSK_USER
   3. lancer :  /usr/local/bin/bureau-simplifie-session
   4. revenir au bureau : Ctrl+Alt+F1 ou F7

 POUR SORTIR DU BUREAU (les portes de secours) :
   - 5 clics rapides sur l'heure en haut à gauche
     -> écran Paramètres, et mode verrouillé désactivé
   - Ctrl+Maj+Q -> fermer complètement
     (SDDM réaffiche alors l'écran de connexion)
   - si l'écran est figé : Ctrl+Alt+F3, puis
       sudo systemctl stop sddm      (ou : sudo pkill bureau-simplifie)

 POUR RÉINITIALISER LES RÉGLAGES (si l'interface est devenue inutilisable) :
   rm ~/.config/fr.bureau.simplifie/settings.json

 MISES À JOUR AUTOMATIQUES :
   au démarrage, le PC compare sa version à la dernière publiée sur GitHub
   et installe le nouveau paquet si nécessaire. L'application affiche alors
   une petite fenêtre « Votre système a été mis à jour. »
   - forcer une vérification :  sudo bureau-simplifie-maj
   - voir le journal :          journalctl -u bureau-simplifie-maj
   - désactiver : modifier ACTIVER=0 dans /etc/bureau-simplifie/maj.conf

 DÉSINSTALLER le kiosque :
   sudo systemctl disable --now bureau-simplifie-maj.service
   sudo rm -f /etc/sddm.conf.d/10-bureau-simplifie.conf \\
              /etc/systemd/logind.conf.d/10-bureau-simplifie.conf \\
              /etc/systemd/system/bureau-simplifie-maj.service \\
              /etc/bureau-simplifie/maj.conf \\
              /usr/local/bin/bureau-simplifie-session \\
              /usr/local/bin/bureau-simplifie-x-session \\
              /usr/local/bin/bureau-simplifie-maj \\
              /usr/share/wayland-sessions/bureau-simplifie.desktop \\
              /usr/share/xsessions/bureau-simplifie-x.desktop
   sudo systemctl daemon-reload
   (facultatif) rétablir les barres de titre de Firefox et Thunderbird :
   supprimer la ligne « gtk-decoration-layout » de
   ~/.config/gtk-3.0/settings.ini et ~/.config/gtk-4.0/settings.ini
────────────────────────────────────────────────────────────────────────
EOF
