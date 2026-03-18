mod commands;
mod ffmpeg;
mod updater;

use ffmpeg::new_registry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(new_registry())
        .invoke_handler(tauri::generate_handler![
            commands::start_job,
            commands::cancel_job,
            commands::probe_file,
            commands::get_ffmpeg_version,
            updater::check_for_update,
            updater::download_and_install_update,
            updater::restart_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
