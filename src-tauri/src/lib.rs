//! Cœur natif du Bureau Simplifié.
//!
//! Volontairement minimal : quelques commandes qui délèguent au système, sans
//! aucun greffon Tauri externe. Moins de dépendances = plus léger et plus rapide.

use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use tauri::{AppHandle, Manager, WebviewWindow};

/// Lance un programme détaché, sans terminal ni entrée/sortie héritée.
fn spawn_detached(program: &str, args: Vec<String>) -> Result<(), String> {
    Command::new(program)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Commande « {program} » impossible : {error}"))
}

fn settings_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Dossier de configuration introuvable : {error}"))?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Création du dossier impossible : {error}"))?;
    Ok(dir.join("settings.json"))
}

/// Développe un « ~/ » initial en dossier personnel.
///
/// Aucun shell n'est lancé entre l'application et le système : la
/// substitution du tilde, que le shell ferait d'ordinaire, doit donc être
/// faite ici, sinon « ~/Images » désignerait un dossier littéralement
/// nommé « ~ ».
fn expand_home(value: &str) -> String {
    if let Some(rest) = value.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
            return format!("{home}/{rest}");
        }
    }
    value.to_string()
}

fn expand_args(args: Vec<String>) -> Vec<String> {
    args.into_iter().map(|arg| expand_home(&arg)).collect()
}

/// Lance une application du système (navigateur, éditeur, outil de numérisation…).
#[tauri::command]
fn launch_app(program: String, args: Vec<String>) -> Result<(), String> {
    if program.trim().is_empty() {
        return Err("Aucun programme indiqué.".to_string());
    }
    spawn_detached(&program, expand_args(args))
}

/// Exécute une commande utilitaire du système.
#[tauri::command]
fn system_run(command: String, args: Vec<String>) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("Aucune commande indiquée.".to_string());
    }
    spawn_detached(&command, expand_args(args))
}

/// Ouvre une adresse web dans le navigateur par défaut.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("Seules les adresses http(s) sont autorisées.".to_string());
    }

    #[cfg(target_os = "linux")]
    let (program, args) = ("xdg-open", vec![url]);

    #[cfg(target_os = "macos")]
    let (program, args) = ("open", vec![url]);

    #[cfg(target_os = "windows")]
    let (program, args) = (
        "cmd",
        vec!["/C".to_string(), "start".to_string(), String::new(), url],
    );

    spawn_detached(program, args)
}

/// Règle le volume du système (0 à 100).
#[tauri::command]
fn set_volume(level: u8) -> Result<(), String> {
    let level = level.min(100);

    #[cfg(target_os = "linux")]
    {
        let percent = format!("{level}%");

        if Command::new("pactl")
            .args(["set-sink-volume", "@DEFAULT_SINK@", percent.as_str()])
            .status()
            .map(|status| status.success())
            .unwrap_or(false)
        {
            return Ok(());
        }

        if Command::new("amixer")
            .args(["-q", "sset", "Master", percent.as_str()])
            .status()
            .map(|status| status.success())
            .unwrap_or(false)
        {
            return Ok(());
        }

        return Err("Aucun contrôleur de volume trouvé (pactl ou amixer).".to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = level;
        Ok(())
    }
}

/// Règle la luminosité de l'écran de 0 à 100, via `brightnessctl`.
///
/// Le paquet `brightnessctl` fournit une règle udev qui autorise les membres du
/// groupe `video` à écrire dans `/sys/class/backlight` : aucun droit root n'est
/// nécessaire pour l'application.
#[tauri::command]
fn set_brightness(level: u8) -> Result<(), String> {
    let level = level.min(100);

    #[cfg(target_os = "linux")]
    {
        let percent = format!("{level}%");
        let ok = Command::new("brightnessctl")
            .args(["set", percent.as_str()])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|status| status.success())
            .unwrap_or(false);

        if ok {
            return Ok(());
        }
        return Err("Luminosité non réglable (installez « brightnessctl »).".to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = level;
        Ok(())
    }
}

/// Lit la luminosité actuelle (0 à 100).
/// Renvoie `None` lorsque l'écran n'a pas de rétroéclairage réglable.
#[tauri::command]
fn read_brightness() -> Option<u8> {
    #[cfg(target_os = "linux")]
    {
        fn capture(arg: &str) -> Option<String> {
            let output = Command::new("brightnessctl").arg(arg).output().ok()?;
            if !output.status.success() {
                return None;
            }
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        }

        let max: u32 = capture("max")?.parse().ok()?;
        let current: u32 = capture("get")?.parse().ok()?;
        if max == 0 {
            return None;
        }
        return Some(((current * 100) / max) as u8);
    }

    #[cfg(not(target_os = "linux"))]
    {
        None
    }
}

/// Encode des octets en base 64 (pour transporter l'aperçu jusqu'à l'interface).
///
/// Écrit à la main : cela évite d'ajouter une dépendance pour une seule
/// fonction, dans l'esprit « le plus léger possible » du projet.
#[cfg(target_os = "linux")]
fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(TABLE[((triple >> 18) & 63) as usize] as char);
        out.push(TABLE[((triple >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((triple >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(triple & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}

/// Chemin du fichier temporaire où est déposé le dernier document scanné.
#[cfg(target_os = "linux")]
fn scan_file() -> PathBuf {
    std::env::temp_dir().join("bureau-simplifie-scan")
}

/// Lance `scanimage` avec une série d'options, jusqu'à ce que l'une fonctionne.
///
/// Selon les modèles, une résolution ou un format peut être refusé : on essaie
/// donc plusieurs combinaisons avant d'abandonner. Renvoie les octets de
/// l'image et son type MIME.
#[cfg(target_os = "linux")]
fn run_scanimage() -> Result<(Vec<u8>, &'static str), String> {
    let attempts: [(&str, &str); 4] = [
        ("jpeg", "--resolution=200"),
        ("jpeg", ""),
        ("png", "--resolution=200"),
        ("png", ""),
    ];

    let mut first_error: Option<String> = None;

    for (index, (format, resolution)) in attempts.iter().enumerate() {
        let mut command = Command::new("scanimage");
        command.arg(format!("--format={format}"));
        if !resolution.is_empty() {
            command.arg(resolution);
        }

        let output = match command.output() {
            Ok(output) => output,
            Err(error) => {
                if error.kind() == std::io::ErrorKind::NotFound {
                    return Err(
                        "Le logiciel de numérisation est absent (installez « sane-utils »)."
                            .to_string(),
                    );
                }
                return Err(format!("Impossible de lancer le scanner : {error}"));
            }
        };

        if output.status.success() && !output.stdout.is_empty() {
            let mime = if *format == "png" {
                "image/png"
            } else {
                "image/jpeg"
            };
            return Ok((output.stdout, mime));
        }

        if index == 0 {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            first_error = Some(if stderr.is_empty() {
                "La numérisation a échoué.".to_string()
            } else if stderr.contains("no SANE devices")
                || stderr.contains("no scanners")
                || stderr.to_lowercase().contains("no such device")
            {
                "Aucun scanner détecté. Vérifiez qu'il est allumé et branché.".to_string()
            } else {
                format!("La numérisation a échoué : {stderr}")
            });
        }
    }

    Err(first_error.unwrap_or_else(|| "La numérisation a échoué.".to_string()))
}

/// Numérise un document et renvoie un aperçu affichable par l'interface.
///
/// Le document est aussi conservé dans un fichier temporaire, pour pouvoir
/// l'enregistrer ensuite sans rescanner.
#[tauri::command]
fn scan_document() -> Result<serde_json::Value, String> {
    #[cfg(target_os = "linux")]
    {
        let (bytes, mime) = run_scanimage()?;

        // Le document reste en fichier temporaire : c'est lui que « Télécharger »
        // recopiera vers le dossier Images.
        let extension = if mime == "image/png" { "png" } else { "jpg" };
        let stored = scan_file().with_extension(extension);
        fs::write(&stored, &bytes)
            .map_err(|error| format!("Écriture du scan impossible : {error}"))?;

        let data_url = format!("data:{mime};base64,{}", base64_encode(&bytes));
        Ok(serde_json::json!({
            "dataUrl": data_url,
            "path": stored.to_string_lossy(),
        }))
    }

    #[cfg(not(target_os = "linux"))]
    {
        Err("La numérisation n'est disponible que sous Linux.".to_string())
    }
}

/// Enregistre le dernier document scanné dans « Images/Numérisations ».
/// Renvoie le chemin complet du fichier créé.
#[tauri::command]
fn save_scan(path: String) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let source = PathBuf::from(path);
        let temp = std::env::temp_dir();

        // Sécurité : on n'accepte de copier qu'un fichier temporaire produit ici.
        let looks_like_scan = source
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with("bureau-simplifie-scan."));
        if !looks_like_scan || source.parent() != Some(temp.as_path()) || !source.is_file() {
            return Err("Document à enregistrer introuvable.".to_string());
        }

        let home = std::env::var("HOME").map_err(|_| "Dossier personnel introuvable.".to_string())?;
        let directory = PathBuf::from(home).join("Images").join("Numérisations");
        fs::create_dir_all(&directory)
            .map_err(|error| format!("Création du dossier impossible : {error}"))?;

        let extension = source
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("jpg");
        let destination = directory.join(format!(
            "numérisation-{}.{extension}",
            timestamp()
        ));

        fs::copy(&source, &destination)
            .map_err(|error| format!("Copie impossible : {error}"))?;

        Ok(destination.to_string_lossy().to_string())
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = path;
        Err("La numérisation n'est disponible que sous Linux.".to_string())
    }
}

/// Horodatage lisible pour nommer les fichiers, via la commande `date`.
#[cfg(target_os = "linux")]
fn timestamp() -> String {
    Command::new("date")
        .arg("+%Y-%m-%d_%Hh%M-%S")
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "document".to_string())
}

/// Applique (ou retire) le mode kiosque : plein écran, sans cadre, au premier plan.
fn apply_kiosk(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_fullscreen(enabled).map_err(|error| error.to_string())?;
    window.set_decorations(!enabled).map_err(|error| error.to_string())?;
    window.set_always_on_top(enabled).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_kiosk(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    apply_kiosk(&window, enabled)
}

/// Vrai lorsque le mode kiosque est imposé par la session (variable d'environnement).
/// Utilisé par la machine qui démarre directement sur le bureau simplifié.
#[tauri::command]
fn kiosk_override() -> bool {
    std::env::var_os("BUREAU_SIMPLIFIE_KIOSK").is_some()
}

/// Ferme l'application proprement.
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Lit les réglages enregistrés (valeur `null` si aucun fichier).
#[tauri::command]
fn load_settings(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    let path = settings_file(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw)
        .map(Some)
        .map_err(|error| format!("Réglages illisibles : {error}"))
}

/// Écrit les réglages sur le disque.
#[tauri::command]
fn save_settings(app: AppHandle, settings: serde_json::Value) -> Result<(), String> {
    let path = settings_file(&app)?;
    let raw = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
    fs::write(&path, raw).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Si la session démarre en kiosque, on l'applique dès la création de
            // la fenêtre : aucun cadre ni barre ne doit apparaître, même furtivement.
            if std::env::var_os("BUREAU_SIMPLIFIE_KIOSK").is_some() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_kiosk(&window, true);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            launch_app,
            system_run,
            open_url,
            set_volume,
            set_brightness,
            read_brightness,
            set_kiosk,
            kiosk_override,
            scan_document,
            save_scan,
            quit_app,
            load_settings,
            save_settings
        ])
        .run(tauri::generate_context!())
        .expect("Erreur au lancement du Bureau Simplifié");
}
