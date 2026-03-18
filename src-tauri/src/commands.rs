use crate::ffmpeg::{self, MediaInfo, ProcessRegistry};
use tauri::{AppHandle, State};

/// Start an FFmpeg job.
/// `args` is the full argument list (without the binary name).
#[tauri::command]
pub async fn start_job(
    app: AppHandle,
    job_id: String,
    args: Vec<String>,
    input_path: String,
    output_path: String,
    registry: State<'_, ProcessRegistry>,
) -> Result<(), String> {
    let ffmpeg_bin = ffmpeg::ffmpeg_path(&app);
    let registry_clone = registry.inner().clone();

    // Ensure output directory exists
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Ausgabeordner konnte nicht erstellt werden: {e}"))?;
    }

    ffmpeg::run_job(app, job_id, ffmpeg_bin, args, output_path, registry_clone);
    void input_path;
    Ok(())
}

/// Cancel a running FFmpeg job by killing the process.
#[tauri::command]
pub async fn cancel_job(
    job_id: String,
    registry: State<'_, ProcessRegistry>,
) -> Result<(), String> {
    let mut reg = registry.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = reg.remove(&job_id) {
        child.kill().map_err(|e| format!("Kill fehlgeschlagen: {e}"))?;
    }
    Ok(())
}

/// Get media info for a file using ffprobe.
#[tauri::command]
pub async fn probe_file(
    app: AppHandle,
    path: String,
) -> Result<MediaInfo, String> {
    let ffprobe_bin = ffmpeg::ffprobe_path(&app);
    ffmpeg::probe_file(&ffprobe_bin, &path)
}

/// Get the installed FFmpeg version string.
#[tauri::command]
pub async fn get_ffmpeg_version(app: AppHandle) -> Result<String, String> {
    let ffmpeg_bin = ffmpeg::ffmpeg_path(&app);
    let output = std::process::Command::new(&ffmpeg_bin)
        .arg("-version")
        .output()
        .map_err(|_| format!("FFmpeg nicht gefunden. Bitte FFmpeg installieren: https://ffmpeg.org/download.html"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Extract version: "ffmpeg version 6.1 Copyright..."
    let version = stdout
        .lines()
        .next()
        .and_then(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            parts.get(2).map(|s| s.to_string())
        })
        .unwrap_or_else(|| "unbekannt".to_string());

    Ok(version)
}

fn void(_: String) {}
