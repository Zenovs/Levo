use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobProgress {
    pub id: String,
    pub percent: f64,
    pub fps: f64,
    pub speed: f64,
    pub frame: u64,
    pub time: String,
    pub size_kb: u64,
    pub eta_seconds: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobCompleted {
    pub id: String,
    pub output_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobError {
    pub id: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub format_name: String,
    pub duration_seconds: f64,
    pub size_bytes: u64,
    pub bit_rate: u64,
    pub streams: Vec<StreamInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamInfo {
    pub index: u32,
    pub codec_type: String,
    pub codec_name: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<String>,
    pub bit_rate: Option<u64>,
    pub channels: Option<u32>,
    pub sample_rate: Option<u32>,
    pub language: Option<String>,
}

// ─── Process Registry ────────────────────────────────────────────────────────

pub type ProcessRegistry = Arc<Mutex<HashMap<String, Child>>>;

pub fn new_registry() -> ProcessRegistry {
    Arc::new(Mutex::new(HashMap::new()))
}

// ─── FFmpeg path detection ────────────────────────────────────────────────────

/// Returns the path to the ffmpeg binary.
/// Checks bundled sidecar (with platform triple naming) first, then system PATH.
pub fn ffmpeg_path(app: &AppHandle) -> String {
    find_binary(app, "ffmpeg")
}

pub fn ffprobe_path(app: &AppHandle) -> String {
    find_binary(app, "ffprobe")
}

fn find_binary(app: &AppHandle, name: &str) -> String {
    // Platform triple for naming bundled binaries
    let triple = env!("TARGET"); // injected by build.rs via cargo
    let exe_suffix = if cfg!(windows) { ".exe" } else { "" };

    if let Ok(resource) = app.path().resource_dir().map(PathBuf::from) {
        // 1. Tauri sidecar convention: <name>-<triple>[.exe]
        let triple_path = resource
            .join("binaries")
            .join(format!("{name}-{triple}{exe_suffix}"));
        if triple_path.exists() {
            return triple_path.to_string_lossy().into_owned();
        }
        // 2. Plain name in binaries/
        let plain = resource.join("binaries").join(format!("{name}{exe_suffix}"));
        if plain.exists() {
            return plain.to_string_lossy().into_owned();
        }
        // 3. In resource root
        let root = resource.join(format!("{name}{exe_suffix}"));
        if root.exists() {
            return root.to_string_lossy().into_owned();
        }
    }
    // 4. Fall back to system PATH
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

// ─── Progress Parsing ────────────────────────────────────────────────────────

static RE_FRAME: Lazy<Regex> = Lazy::new(|| Regex::new(r"frame=\s*(\d+)").unwrap());
static RE_FPS:   Lazy<Regex> = Lazy::new(|| Regex::new(r"fps=\s*([\d.]+)").unwrap());
static RE_TIME:  Lazy<Regex> = Lazy::new(|| Regex::new(r"time=([\d:.]+)").unwrap());
static RE_SPEED: Lazy<Regex> = Lazy::new(|| Regex::new(r"speed=\s*([\d.]+)x").unwrap());
static RE_SIZE:  Lazy<Regex> = Lazy::new(|| Regex::new(r"size=\s*(\d+)kB").unwrap());

fn time_to_seconds(time: &str) -> f64 {
    let parts: Vec<&str> = time.split(':').collect();
    match parts.as_slice() {
        [h, m, s] => {
            h.parse::<f64>().unwrap_or(0.0) * 3600.0
                + m.parse::<f64>().unwrap_or(0.0) * 60.0
                + s.parse::<f64>().unwrap_or(0.0)
        }
        [m, s] => m.parse::<f64>().unwrap_or(0.0) * 60.0 + s.parse::<f64>().unwrap_or(0.0),
        [s] => s.parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

pub fn parse_progress(line: &str, job_id: &str, total_duration: f64) -> Option<JobProgress> {
    if !line.contains("time=") {
        return None;
    }

    let frame = RE_FRAME
        .captures(line)
        .and_then(|c| c[1].parse::<u64>().ok())
        .unwrap_or(0);
    let fps = RE_FPS
        .captures(line)
        .and_then(|c| c[1].parse::<f64>().ok())
        .unwrap_or(0.0);
    let time_str = RE_TIME
        .captures(line)
        .map(|c| c[1].to_string())
        .unwrap_or_default();
    let speed = RE_SPEED
        .captures(line)
        .and_then(|c| c[1].parse::<f64>().ok())
        .unwrap_or(0.0);
    let size_kb = RE_SIZE
        .captures(line)
        .and_then(|c| c[1].parse::<u64>().ok())
        .unwrap_or(0);

    let current_seconds = time_to_seconds(&time_str);
    let percent = if total_duration > 0.0 {
        (current_seconds / total_duration * 100.0).min(100.0)
    } else {
        0.0
    };

    let eta_seconds = if speed > 0.0 && total_duration > 0.0 {
        let remaining = total_duration - current_seconds;
        Some((remaining / speed).max(0.0))
    } else {
        None
    };

    Some(JobProgress {
        id: job_id.to_string(),
        percent,
        fps,
        speed,
        frame,
        time: time_str,
        size_kb,
        eta_seconds,
    })
}

// ─── Run FFmpeg Job ──────────────────────────────────────────────────────────

pub fn run_job(
    app: AppHandle,
    job_id: String,
    ffmpeg_bin: String,
    args: Vec<String>,
    output_path: String,
    registry: ProcessRegistry,
) {
    std::thread::spawn(move || {
        let mut cmd = Command::new(&ffmpeg_bin);
        cmd.args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit(
                    "job:error",
                    JobError {
                        id: job_id.clone(),
                        message: format!("FFmpeg konnte nicht gestartet werden: {e}. Ist FFmpeg installiert?"),
                    },
                );
                return;
            }
        };

        let stderr = match child.stderr.take() {
            Some(s) => s,
            None => {
                let _ = app.emit(
                    "job:error",
                    JobError { id: job_id, message: "Kein stderr verfügbar".into() },
                );
                return;
            }
        };

        // Store child
        {
            let mut reg = registry.lock().unwrap();
            reg.insert(job_id.clone(), child);
        }

        let reader = BufReader::new(stderr);
        // Detect duration from first lines for progress calculation
        let mut total_duration: f64 = 0.0;
        static RE_DUR: Lazy<Regex> =
            Lazy::new(|| Regex::new(r"Duration:\s*([\d:.]+)").unwrap());

        for line in reader.lines().flatten() {
            // Try to get duration from first few lines
            if total_duration == 0.0 {
                if let Some(cap) = RE_DUR.captures(&line) {
                    total_duration = time_to_seconds(&cap[1]);
                }
            }

            // Parse progress
            if let Some(progress) = parse_progress(&line, &job_id, total_duration) {
                let _ = app.emit("job:progress", progress);
            }
        }

        // Wait for process to finish
        let exit_status = {
            let mut reg = registry.lock().unwrap();
            if let Some(mut child) = reg.remove(&job_id) {
                child.wait().ok()
            } else {
                // Job was cancelled
                let _ = app.emit(
                    "job:error",
                    JobError { id: job_id, message: "Abgebrochen".into() },
                );
                return;
            }
        };

        match exit_status {
            Some(status) if status.success() => {
                let _ = app.emit("job:completed", JobCompleted { id: job_id, output_path });
            }
            Some(status) => {
                let _ = app.emit(
                    "job:error",
                    JobError {
                        id: job_id,
                        message: format!("FFmpeg beendet mit Status: {status}"),
                    },
                );
            }
            None => {
                let _ = app.emit(
                    "job:error",
                    JobError { id: job_id, message: "Prozess wurde unerwartet beendet".into() },
                );
            }
        }
    });
}

// ─── Probe File ──────────────────────────────────────────────────────────────

pub fn probe_file(ffprobe_bin: &str, path: &str) -> Result<MediaInfo, String> {
    let output = Command::new(ffprobe_bin)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()
        .map_err(|e| format!("ffprobe nicht gefunden: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "ffprobe Fehler: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("JSON-Fehler: {e}"))?;

    let format = &json["format"];
    let format_name = format["format_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    let duration_seconds = format["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let size_bytes = format["size"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);
    let bit_rate = format["bit_rate"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    let streams = json["streams"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|s| {
            let tags = &s["tags"];
            StreamInfo {
                index: s["index"].as_u64().unwrap_or(0) as u32,
                codec_type: s["codec_type"].as_str().unwrap_or("").to_string(),
                codec_name: s["codec_name"].as_str().unwrap_or("").to_string(),
                width: s["width"].as_u64().map(|v| v as u32),
                height: s["height"].as_u64().map(|v| v as u32),
                frame_rate: s["r_frame_rate"].as_str().map(|s| s.to_string()),
                bit_rate: s["bit_rate"].as_str().and_then(|v| v.parse().ok()),
                channels: s["channels"].as_u64().map(|v| v as u32),
                sample_rate: s["sample_rate"]
                    .as_str()
                    .and_then(|v| v.parse().ok()),
                language: tags["language"].as_str().map(|s| s.to_string()),
            }
        })
        .collect();

    Ok(MediaInfo { format_name, duration_seconds, size_bytes, bit_rate, streams })
}
