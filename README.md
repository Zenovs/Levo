```
 ██╗     ███████╗██╗   ██╗ ██████╗
 ██║     ██╔════╝██║   ██║██╔═══██╗
 ██║     █████╗  ██║   ██║██║   ██║
 ██║     ██╔══╝  ╚██╗ ██╔╝██║   ██║
 ███████╗███████╗ ╚████╔╝ ╚██████╔╝
 ╚══════╝╚══════╝  ╚═══╝   ╚═════╝
```

Eine plattformübergreifende Desktop-Anwendung für FFmpeg – Audio & Video konvertieren ohne Kommandozeile.

## Download

> **FFmpeg wird automatisch mitinstalliert** – keine separate Installation nötig.

| Plattform | Download |
|---|---|
| 🪟 Windows | [→ Installer (.exe / .msi)](https://github.com/Zenovs/Levo/releases/latest) |
| 🍎 macOS | [→ Disk Image (.dmg)](https://github.com/Zenovs/Levo/releases/latest) |
| 🐧 Linux | [→ AppImage / .deb](https://github.com/Zenovs/Levo/releases/latest) |

→ **[Alle Releases & Changelogs](https://github.com/Zenovs/Levo/releases)**

---

## Features

- **Drag & Drop** – Dateien einfach ins Fenster ziehen
- **Alle Formate** – MP4, MKV, WebM, MOV, AVI, MP3, AAC, FLAC, GIF und viele mehr
- **Video-Einstellungen** – Codec (H.264, H.265, VP9, AV1), Auflösung, FPS, CRF/CBR/VBR
- **Audio-Einstellungen** – Codec, Bitrate, Sample Rate, Kanäle
- **Schnitt/Trimmen** – Start- und Endpunkt per Zeitstempel
- **Batch-Verarbeitung** – Mehrere Dateien gleichzeitig in der Queue
- **Schnell-Presets** – Web-Video, MP3, Dateigröße reduzieren, Screencast, GIF, FLAC
- **3 Themes** – Dark, Light, Color (lila)
- **FFmpeg-Befehl-Vorschau** – Immer sichtbar, kopierbar
- **Hardware-Beschleunigung** – NVENC, QSV, VideoToolbox, VAAPI
- **Auto-Update** – Direkt in der App auf neue Versionen aktualisieren

---

## Entwicklung

### Voraussetzungen
- [Node.js](https://nodejs.org/) 22+
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- Linux: `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev ffmpeg`
- macOS: `brew install ffmpeg`

### Setup
```bash
git clone https://github.com/Zenovs/Levo
cd Levo
npm install
npm run tauri dev
```

### Build
```bash
npm run tauri build
```

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| UI | React 18 + TypeScript |
| Komponenten | Radix UI + Tailwind CSS |
| State | Zustand |
| Desktop-Shell | Tauri 2.x (Rust) |
| FFmpeg | Gebundelt + System-Fallback |
| Build | Vite + GitHub Actions |

## Lizenz

MIT License – Siehe [LICENSE](LICENSE) für Details.
FFmpeg-Binary (Windows/macOS) unter LGPL – Siehe [NOTICE.md](NOTICE.md).
