# FFmpegUI

Eine plattformübergreifende Desktop-Anwendung, die die vollständige Funktionalität von FFmpeg über eine einfache, intuitive grafische Benutzeroberfläche zugänglich macht.

![FFmpegUI Screenshot](docs/screenshot.png)

## Features

- **Drag & Drop** – Dateien einfach ins Fenster ziehen
- **Alle Formate** – MP4, MKV, WebM, MOV, AVI, MP3, AAC, FLAC, GIF und viele mehr
- **Video-Einstellungen** – Codec (H.264, H.265, VP9, AV1), Auflösung, FPS, CRF/CBR/VBR
- **Audio-Einstellungen** – Codec, Bitrate, Sample Rate, Kanäle
- **Schnitt/Trimmen** – Start- und Endpunkt per Zeitstempel
- **Batch-Verarbeitung** – Mehrere Dateien in der Queue
- **Schnell-Presets** – Web-Video, MP3, Dateigröße reduzieren, GIF, FLAC
- **FFmpeg-Befehl-Vorschau** – Immer sichtbar, kopierbar
- **Hardware-Beschleunigung** – NVENC, QSV, VideoToolbox, VAAPI (automatisch wählbar)
- **Fortschrittsanzeige** – Echtzeit mit FPS, Speed und ETA

## Download

Lade die neueste Version für dein Betriebssystem herunter:

| Plattform | Datei |
|---|---|
| Windows | `FFmpegUI_x.x.x_x64-setup.exe` oder `.msi` |
| macOS | `FFmpegUI_x.x.x_universal.dmg` |
| Linux | `ffmpegui_x.x.x_amd64.AppImage` oder `.deb` |

→ **[Neueste Version auf GitHub Releases](../../releases/latest)**

## Voraussetzungen

FFmpegUI benötigt FFmpeg auf deinem System:

### Linux
```bash
sudo apt install ffmpeg       # Ubuntu/Debian
sudo dnf install ffmpeg       # Fedora
sudo pacman -S ffmpeg         # Arch Linux
```

### macOS
```bash
brew install ffmpeg
```

### Windows
FFmpeg wird automatisch mitgebündelt – keine separate Installation nötig.

## Entwicklung

### Voraussetzungen
- [Node.js](https://nodejs.org/) 22+
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- Tauri-Systemabhängigkeiten (Linux): `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev`

### Setup
```bash
git clone https://github.com/dario-zenhaeusern/Levo
cd Levo
npm install
npm run tauri dev
```

### Build
```bash
npm run tauri build
```

## Tech Stack

| Schicht | Technologie |
|---|---|
| UI | React 18 + TypeScript |
| Komponenten | Radix UI + Tailwind CSS |
| State | Zustand |
| Desktop-Shell | Tauri 2.x (Rust) |
| FFmpeg | System-Binary oder Sidecar |
| Build | Vite |

## Projektstruktur

```
├── src/                    # React Frontend (TypeScript)
│   ├── components/         # UI-Komponenten
│   ├── stores/             # Zustand State Stores
│   └── lib/                # Utilities, Typen, FFmpeg-Builder
├── src-tauri/              # Rust Backend
│   └── src/
│       ├── commands.rs     # Tauri IPC-Commands
│       └── ffmpeg/         # FFmpeg Prozess-Management
└── .github/workflows/      # CI/CD GitHub Actions
```

## Lizenz

MIT License – Siehe [LICENSE](LICENSE) für Details.

Das mitgelieferte FFmpeg-Binary (Windows) steht unter der LGPL-Lizenz. Siehe [NOTICE.md](NOTICE.md).
