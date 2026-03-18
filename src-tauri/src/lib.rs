mod commands;
mod ffmpeg;

use ffmpeg::new_registry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(new_registry())
        .invoke_handler(tauri::generate_handler![
            commands::start_job,
            commands::cancel_job,
            commands::probe_file,
            commands::get_ffmpeg_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
