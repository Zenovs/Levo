import { useSettingsStore } from "../stores/settingsStore";
import { useQueueStore } from "../stores/queueStore";
import {
  FORMATS, VIDEO_CODECS, AUDIO_CODECS, RESOLUTIONS, FRAMERATES,
  ENCODING_PRESETS, AUDIO_BITRATES, VIDEO_BITRATES, SAMPLE_RATES, CHANNELS, HW_ACCELS,
} from "../lib/formats";
import { buildOutputPath } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";
import { Folder, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";
import type { ConversionSettings, HlsSettings } from "../lib/types";

// ─── Reusable mini-components ─────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-header mb-2">{children}</div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{children}</label>
      {hint && (
        <div className="group relative">
          <Info className="h-3 w-3 cursor-help" style={{ color: "var(--text-muted)" }} />
          <div
            className="absolute left-0 bottom-5 z-20 w-48 rounded-lg p-2 text-xs hidden group-hover:block shadow-lg"
            style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("w-full rounded-lg px-3 py-2 text-xs font-medium appearance-none cursor-pointer transition-colors focus:outline-none", className)}
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: "2rem",
      }}
    >
      {children}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-xs transition-all focus:outline-none"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--border-focus)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    />
  );
}

function SegmentControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex rounded-lg p-0.5 gap-0.5"
      style={{ background: "var(--bg-overlay)" }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="flex-1 rounded-md py-1.5 text-xs font-semibold transition-all"
          style={
            value === o.value
              ? { background: "var(--primary)", color: "white", boxShadow: "0 1px 4px var(--primary-glow)" }
              : { color: "var(--text-muted)" }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  min, max, step, value, onChange,
}: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--primary) ${pct}%, var(--bg-overlay) ${pct}%)`,
          outline: "none",
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--primary);
          box-shadow: 0 0 0 3px var(--primary-glow);
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--primary);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center rounded-full w-9 h-5 transition-all"
      style={{ background: checked ? "var(--primary)" : "var(--bg-overlay)" }}
    >
      <span
        className="inline-block w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors"
        style={{
          background: open ? "var(--bg-elevated)" : "var(--bg-surface)",
          color: "var(--text-secondary)",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 space-y-3" style={{ background: "var(--bg-surface)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
      style={
        active
          ? { background: "var(--primary)", color: "white" }
          : { color: "var(--text-muted)" }
      }
    >
      {children}
    </button>
  );
}

// ─── Format button ────────────────────────────────────────────────────────────
function FmtBtn({ ext, label, active, onClick, type }: {
  ext: string; label: string; active: boolean; onClick: () => void; type: "video" | "audio" | "image";
}) {
  const colors: Record<string, string> = { video: "#3b82f6", audio: "#a855f7", image: "#f59e0b" };
  const c = colors[type];
  return (
    <button
      onClick={onClick}
      title={label}
      className="rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase transition-all"
      style={
        active
          ? { background: `color-mix(in srgb, ${c} 20%, transparent)`, color: c, border: `1px solid ${c}` }
          : { background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }
      }
    >
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "video" | "audio" | "trim" | "hls" | "output";

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>("video");
  const {
    settings,
    setOutputFormat,
    setVideoSettings,
    setAudioSettings,
    setTrim,
    setHlsSettings,
    setOutputDir,
    setOutputFileSuffix,
  } = useSettingsStore();
  const { selectedJobId, jobs } = useQueueStore();

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const isAudioOnly = ["mp3","aac","flac","wav","ogg","m4a","opus","ac3"].includes(settings.outputFormat);
  const isGif  = settings.outputFormat === "gif";
  const isHls  = settings.outputFormat === "m3u8";

  const outputPreview = buildOutputPath(
    selectedJob?.inputPath ?? "/pfad/zur/datei.mp4",
    settings.outputDir,
    settings.outputFileSuffix,
    settings.outputFormat
  );

  async function pickOutputDir() {
    try {
      const dir = await open({ directory: true, title: "Ausgabeordner wählen" });
      if (typeof dir === "string") setOutputDir(dir);
    } catch (e) { console.error(e); }
  }

  // Auto-switch tabs when format changes
  const effectiveTab =
    isAudioOnly && tab === "video" ? "audio" :
    isHls && tab === "video" ? "hls" :
    isHls && tab === "trim" ? "hls" :
    tab;

  return (
    <div className="flex flex-col h-full">
      {/* ── Format row ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <SectionTitle>Ausgabeformat</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((fmt) => (
            <FmtBtn
              key={fmt.ext}
              ext={fmt.ext}
              label={fmt.label}
              active={settings.outputFormat === fmt.ext}
              onClick={() => setOutputFormat(fmt.ext)}
              type={fmt.type}
            />
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-2">
        <div
          className="flex rounded-xl p-0.5 gap-0.5"
          style={{ background: "var(--bg-overlay)" }}
        >
          {!isAudioOnly && !isHls && (
            <TabBtn active={effectiveTab === "video"} onClick={() => setTab("video")}>Video</TabBtn>
          )}
          {!isHls && (
            <TabBtn active={effectiveTab === "audio"} onClick={() => setTab("audio")}>Audio</TabBtn>
          )}
          {isHls && (
            <TabBtn active={effectiveTab === "hls"} onClick={() => setTab("hls")}>HLS</TabBtn>
          )}
          {!isHls && (
            <TabBtn active={effectiveTab === "trim"}  onClick={() => setTab("trim")}>Schnitt</TabBtn>
          )}
          <TabBtn active={effectiveTab === "output"} onClick={() => setTab("output")}>Ausgabe</TabBtn>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">

        {/* ═══ VIDEO ═══ */}
        {effectiveTab === "video" && !isAudioOnly && (
          <>
            <div>
              <FieldLabel hint="Der Video-Encoder. 'Stream Copy' kopiert ohne Re-Encoding (schnell, verlustfrei).">
                Video-Codec
              </FieldLabel>
              <NativeSelect value={settings.videoSettings.codec} onChange={(v) => setVideoSettings({ codec: v as ConversionSettings["videoSettings"]["codec"] })}>
                {VIDEO_CODECS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </NativeSelect>
            </div>

            {settings.videoSettings.codec !== "copy" && !isGif && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel hint="Ausgabeauflösung. 'Original' behält die Quellauflösung.">Auflösung</FieldLabel>
                    <NativeSelect value={settings.videoSettings.resolution} onChange={(v) => setVideoSettings({ resolution: v })}>
                      {RESOLUTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <FieldLabel hint="Frames pro Sekunde der Ausgabe.">Framerate</FieldLabel>
                    <NativeSelect value={settings.videoSettings.framerate} onChange={(v) => setVideoSettings({ framerate: v })}>
                      {FRAMERATES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </NativeSelect>
                  </div>
                </div>

                {/* Rate Control */}
                <div>
                  <FieldLabel hint="CRF = konstante Qualität (empfohlen). CBR/VBR = feste Bitrate.">
                    Qualitätsmodus
                  </FieldLabel>
                  <SegmentControl
                    value={settings.videoSettings.rateControl}
                    onChange={(v) => setVideoSettings({ rateControl: v as "crf"|"cbr"|"vbr" })}
                    options={[{ value: "crf", label: "CRF" }, { value: "cbr", label: "CBR" }, { value: "vbr", label: "VBR" }]}
                  />
                </div>

                {settings.videoSettings.rateControl === "crf" ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <FieldLabel hint="0 = maximale Qualität (größte Datei). 51 = kleinste Datei (schlechteste Qualität). 23 ist empfohlen.">
                        CRF-Wert
                      </FieldLabel>
                      <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md" style={{ background: "var(--bg-overlay)", color: "var(--primary)" }}>
                        {settings.videoSettings.crfValue}
                      </span>
                    </div>
                    <Slider min={0} max={51} step={1} value={settings.videoSettings.crfValue} onChange={(v) => setVideoSettings({ crfValue: v })} />
                    <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>Beste Qualität</span>
                      <span>Kleinste Datei</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <FieldLabel>Video-Bitrate</FieldLabel>
                    <NativeSelect value={settings.videoSettings.bitrate} onChange={(v) => setVideoSettings({ bitrate: v })}>
                      {VIDEO_BITRATES.map((b) => <option key={b} value={b}>{b.replace("k", " kbps")}</option>)}
                    </NativeSelect>
                  </div>
                )}

                {["libx264","libx265","libvpx-vp9"].includes(settings.videoSettings.codec) && (
                  <div>
                    <FieldLabel hint="Geschwindigkeit vs. Kompression. 'medium' ist ein guter Standard.">
                      Encoding-Preset
                    </FieldLabel>
                    <NativeSelect value={settings.videoSettings.preset} onChange={(v) => setVideoSettings({ preset: v })}>
                      {ENCODING_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </NativeSelect>
                  </div>
                )}

                <Collapsible title="Erweiterte Einstellungen">
                  <div>
                    <FieldLabel hint="yuv420p ist am kompatibelsten. yuv444p hat höhere Farbtiefe.">
                      Pixel-Format
                    </FieldLabel>
                    <NativeSelect value={settings.videoSettings.pixFmt} onChange={(v) => setVideoSettings({ pixFmt: v })}>
                      <option value="yuv420p">yuv420p (Standard)</option>
                      <option value="yuv422p">yuv422p</option>
                      <option value="yuv444p">yuv444p (höchste Qualität)</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <FieldLabel hint="Nutzt GPU zur Beschleunigung. Nur wählen wenn verfügbar.">
                      Hardware-Beschleunigung
                    </FieldLabel>
                    <NativeSelect value={settings.videoSettings.hwAccel} onChange={(v) => setVideoSettings({ hwAccel: v })}>
                      {HW_ACCELS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </NativeSelect>
                  </div>
                </Collapsible>
              </>
            )}

            {settings.videoSettings.codec === "copy" && (
              <div
                className="rounded-xl p-3 text-xs"
                style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary)", color: "var(--text-secondary)" }}
              >
                <span className="font-semibold" style={{ color: "var(--primary)" }}>Stream Copy:</span>{" "}
                Video wird ohne Re-Encoding kopiert – verlustfrei und sehr schnell.
              </div>
            )}
          </>
        )}

        {/* ═══ AUDIO ═══ */}
        {effectiveTab === "audio" && (
          <>
            <div>
              <FieldLabel>Audio-Codec</FieldLabel>
              <NativeSelect value={settings.audioSettings.codec} onChange={(v) => setAudioSettings({ codec: v as ConversionSettings["audioSettings"]["codec"] })}>
                {AUDIO_CODECS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </NativeSelect>
            </div>

            {settings.audioSettings.codec !== "copy" && settings.audioSettings.codec !== "flac" && settings.audioSettings.codec !== "pcm_s16le" && (
              <div>
                <FieldLabel hint="Höhere Bitrate = bessere Qualität und größere Datei. 192k ist Standard.">
                  Audio-Bitrate
                </FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {AUDIO_BITRATES.map((b) => (
                    <button
                      key={b}
                      onClick={() => setAudioSettings({ bitrate: b })}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                      style={
                        settings.audioSettings.bitrate === b
                          ? { background: "var(--primary)", color: "white" }
                          : { background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }
                      }
                    >
                      {b.replace("k", "k")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Sample Rate</FieldLabel>
                <NativeSelect value={settings.audioSettings.sampleRate} onChange={(v) => setAudioSettings({ sampleRate: v })}>
                  {SAMPLE_RATES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </NativeSelect>
              </div>
              <div>
                <FieldLabel>Kanäle</FieldLabel>
                <NativeSelect value={settings.audioSettings.channels} onChange={(v) => setAudioSettings({ channels: v })}>
                  {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </NativeSelect>
              </div>
            </div>
          </>
        )}

        {/* ═══ TRIM ═══ */}
        {effectiveTab === "trim" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Schnitt aktivieren</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Start- und Endpunkt festlegen</p>
              </div>
              <Toggle checked={settings.trim.enabled} onChange={(v) => setTrim({ enabled: v })} id="trim-toggle" />
            </div>

            {settings.trim.enabled ? (
              <>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <FieldLabel>Startzeit</FieldLabel>
                    <TextInput
                      value={settings.trim.startTime}
                      onChange={(v) => setTrim({ startTime: v })}
                      placeholder="00:00:00"
                    />
                  </div>
                  <div>
                    <FieldLabel>Endzeit</FieldLabel>
                    <TextInput
                      value={settings.trim.endTime}
                      onChange={(v) => setTrim({ endTime: v })}
                      placeholder="00:00:00"
                    />
                  </div>
                </div>
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}
                >
                  Format: <span className="font-mono" style={{ color: "var(--text-secondary)" }}>HH:MM:SS</span>{" "}
                  oder <span className="font-mono" style={{ color: "var(--text-secondary)" }}>HH:MM:SS.ms</span>
                </div>
              </>
            ) : (
              <div
                className="rounded-xl p-6 flex flex-col items-center gap-2 text-center"
                style={{ background: "var(--bg-overlay)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Aktiviere den Schnitt um einen Bereich auszuwählen
                </p>
              </div>
            )}
          </>
        )}

        {/* ═══ HLS ═══ */}
        {effectiveTab === "hls" && (
          <>
            {/* Info banner */}
            <div
              className="rounded-xl p-3 text-xs"
              style={{ background: "var(--primary-subtle)", border: "1px solid var(--primary)", color: "var(--text-secondary)" }}
            >
              <span className="font-semibold" style={{ color: "var(--primary)" }}>HLS Output:</span>{" "}
              Erzeugt eine <code>.m3u8</code>-Playlist und nummerierte <code>.ts</code>-Segmente im gleichen Ordner.
            </div>

            {/* Segment duration */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <FieldLabel hint="Länge jedes einzelnen .ts-Segments in Sekunden. Kleinere Werte = mehr Dateien, schnelleres Seek.">
                  Segmentlänge
                </FieldLabel>
                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md" style={{ background: "var(--bg-overlay)", color: "var(--primary)" }}>
                  {settings.hlsSettings.segmentDuration}s
                </span>
              </div>
              <Slider
                min={1} max={60} step={1}
                value={settings.hlsSettings.segmentDuration}
                onChange={(v) => setHlsSettings({ segmentDuration: v })}
              />
              <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>1s (Live)</span>
                <span>6s (Standard)</span>
                <span>60s (VOD)</span>
              </div>
            </div>

            {/* List size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <FieldLabel hint="Maximale Anzahl Segmente in der Playlist. 0 = alle Segmente behalten (empfohlen für VOD).">
                  Playlist-Größe
                </FieldLabel>
                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md" style={{ background: "var(--bg-overlay)", color: "var(--primary)" }}>
                  {settings.hlsSettings.listSize === 0 ? "alle" : settings.hlsSettings.listSize}
                </span>
              </div>
              <Slider
                min={0} max={20} step={1}
                value={settings.hlsSettings.listSize}
                onChange={(v) => setHlsSettings({ listSize: v })}
              />
              <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>0 = alle</span>
                <span>Live-Fenster →</span>
                <span>20</span>
              </div>
            </div>

            {/* Playlist type */}
            <div>
              <FieldLabel hint="VOD: komplette Datei. Event: wächst live. None: kein Type-Tag.">
                Playlist-Typ
              </FieldLabel>
              <SegmentControl
                value={settings.hlsSettings.playlistType}
                onChange={(v) => setHlsSettings({ playlistType: v as HlsSettings["playlistType"] })}
                options={[
                  { value: "vod",   label: "VOD" },
                  { value: "event", label: "Event (Live)" },
                  { value: "none",  label: "Keiner" },
                ]}
              />
            </div>

            {/* Start number */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <FieldLabel hint="Nummer des ersten Segments. Standard ist 0 (segment_000.ts).">
                  Start-Nummer
                </FieldLabel>
                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md" style={{ background: "var(--bg-overlay)", color: "var(--primary)" }}>
                  {settings.hlsSettings.startNumber}
                </span>
              </div>
              <Slider
                min={0} max={100} step={1}
                value={settings.hlsSettings.startNumber}
                onChange={(v) => setHlsSettings({ startNumber: v })}
              />
            </div>

            {/* Video quality for HLS */}
            <Collapsible title="Video-Qualität" defaultOpen>
              <div>
                <FieldLabel>Codec</FieldLabel>
                <NativeSelect
                  value={settings.videoSettings.codec}
                  onChange={(v) => setVideoSettings({ codec: v as ConversionSettings["videoSettings"]["codec"] })}
                >
                  <option value="libx264">H.264 (libx264) – empfohlen</option>
                  <option value="copy">Stream Copy (kein Re-Encoding)</option>
                </NativeSelect>
              </div>
              {settings.videoSettings.codec !== "copy" && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <FieldLabel hint="Niedrigerer Wert = bessere Qualität.">CRF-Wert</FieldLabel>
                      <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md" style={{ background: "var(--bg-overlay)", color: "var(--primary)" }}>
                        {settings.videoSettings.crfValue}
                      </span>
                    </div>
                    <Slider min={0} max={51} step={1} value={settings.videoSettings.crfValue} onChange={(v) => setVideoSettings({ crfValue: v })} />
                  </div>
                  <div>
                    <FieldLabel>Encoding-Preset</FieldLabel>
                    <NativeSelect value={settings.videoSettings.preset} onChange={(v) => setVideoSettings({ preset: v })}>
                      {ENCODING_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </NativeSelect>
                  </div>
                </>
              )}
              <div>
                <FieldLabel>Audio-Bitrate</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {AUDIO_BITRATES.map((b) => (
                    <button key={b} onClick={() => setAudioSettings({ bitrate: b })}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                      style={settings.audioSettings.bitrate === b
                        ? { background: "var(--primary)", color: "white" }
                        : { background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >{b}</button>
                  ))}
                </div>
              </div>
            </Collapsible>
          </>
        )}

        {/* ═══ OUTPUT ═══ */}
        {effectiveTab === "output" && (
          <>
            <div>
              <FieldLabel>Ausgabeordner</FieldLabel>
              <div className="flex gap-2">
                <TextInput
                  value={settings.outputDir}
                  onChange={setOutputDir}
                  placeholder="Standard: Quellordner"
                />
                <button
                  onClick={pickOutputDir}
                  className="shrink-0 rounded-lg px-3 transition-colors hover:bg-[color:var(--bg-elevated)]"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  <Folder className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <FieldLabel hint="Wird an den Dateinamen angehängt, z.B. 'video_converted.mp4'">
                Dateiname-Suffix
              </FieldLabel>
              <TextInput
                value={settings.outputFileSuffix}
                onChange={setOutputFileSuffix}
                placeholder="_converted"
              />
            </div>

            <div
              className="rounded-xl p-3 space-y-1"
              style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)" }}
            >
              <p className="section-header">Vorschau</p>
              <p className="font-mono text-xs break-all leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {outputPreview}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
