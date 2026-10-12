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

/// Lance une application du système (navigateur, éditeur, outil de numérisation…).
#[tauri::command]
fn launch_app(program: String, args: Vec<String>) -> Result<(), String> {
    if program.trim().is_empty() {
        return Err("Aucun programme indiqué.".to_string());
    }
    spawn_detached(&program, args)
}

/// Exécute une commande utilitaire du système.
#[tauri::command]
fn system_run(command: String, args: Vec<String>) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("Aucune commande indiquée.".to_string());
    }
    spawn_detached(&command, args)
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

/// Active ou désactive le mode kiosque : plein écran, sans cadre, au premier plan.
#[tauri::command]
fn set_kiosk(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window.set_fullscreen(enabled).map_err(|error| error.to_string())?;
    window.set_decorations(!enabled).map_err(|error| error.to_string())?;
    window.set_always_on_top(enabled).map_err(|error| error.to_string())?;
    Ok(())
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
        .invoke_handler(tauri::generate_handler![
            launch_app,
            system_run,
            open_url,
            set_volume,
            set_kiosk,
            quit_app,
            load_settings,
            save_settings
        ])
        .run(tauri::generate_context!())
        .expect("Erreur au lancement du Bureau Simplifié");
}
