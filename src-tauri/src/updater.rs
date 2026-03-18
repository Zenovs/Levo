use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub current_version: Option<String>,
    pub body: Option<String>,
    pub download_url: Option<String>,
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let package_info = app.package_info();
    let current_version = package_info.version.to_string();

    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| format!("Updater-Fehler: {e}"))?;

    match updater.check().await {
        Ok(Some(update)) => Ok(UpdateInfo {
            available: true,
            version: Some(update.version.clone()),
            current_version: Some(current_version),
            body: update.body.clone(),
            download_url: None,
        }),
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
            current_version: Some(current_version),
            body: None,
            download_url: None,
        }),
        Err(e) => Err(format!("Update-Prüfung fehlgeschlagen: {e}")),
    }
}

#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| format!("Updater-Fehler: {e}"))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Prüfung fehlgeschlagen: {e}"))?
        .ok_or_else(|| "Kein Update verfügbar".to_string())?;

    update
        .download_and_install(|_chunk, _total| {}, || {})
        .await
        .map_err(|e| format!("Installation fehlgeschlagen: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn restart_app(app: AppHandle) -> Result<(), String> {
    app.restart();
}
