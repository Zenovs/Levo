import { useSettingsStore } from "../stores/settingsStore";
import { useQueueStore } from "../stores/queueStore";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Label, Input, Slider, Switch, Button, Badge, Accordion, AccordionItem, AccordionTrigger, AccordionContent, Separator,
} from "./ui/index";
import {
  FORMATS, VIDEO_CODECS, AUDIO_CODECS, RESOLUTIONS, FRAMERATES,
  ENCODING_PRESETS, AUDIO_BITRATES, VIDEO_BITRATES, SAMPLE_RATES, CHANNELS, HW_ACCELS,
} from "../lib/formats";
import { buildOutputPath } from "../lib/utils";
import { open } from "@tauri-apps/plugin-dialog";

export function SettingsPanel() {
  const { settings, setOutputFormat, setVideoSettings, setAudioSettings, setTrim, setOutputDir, setOutputFileSuffix } = useSettingsStore();
  const { selectedJobId, jobs } = useQueueStore();

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const isAudioOnly = ["mp3", "aac", "flac", "wav", "ogg", "m4a", "opus", "ac3"].includes(settings.outputFormat);
  const isGif = settings.outputFormat === "gif";

  const outputPreview = buildOutputPath(
    selectedJob?.inputPath ?? "/pfad/zur/datei.mp4",
    settings.outputDir,
    settings.outputFileSuffix,
    settings.outputFormat
  );

  async function pickOutputDir() {
    try {
      const dir = await open({ directory: true, title: "Ausgabeordner wählen" });
      if (typeof dir === "string") {
        setOutputDir(dir);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 gap-4">

      {/* ── Format ─────────────────────────────────────────────────────────── */}
      <section>
        <Label className="mb-1.5 block text-xs font-semibold text-foreground">Ausgabeformat</Label>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6">
          {FORMATS.filter(f => f.type !== "image" || f.ext === "gif").map((fmt) => (
            <button
              key={fmt.ext}
              onClick={() => setOutputFormat(fmt.ext)}
              title={fmt.description}
              className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                settings.outputFormat === fmt.ext
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <Tabs defaultValue="video">
        <TabsList className="w-full">
          {!isAudioOnly && <TabsTrigger value="video" className="flex-1">Video</TabsTrigger>}
          <TabsTrigger value="audio" className="flex-1">Audio</TabsTrigger>
          <TabsTrigger value="trim" className="flex-1">Schnitt</TabsTrigger>
          <TabsTrigger value="output" className="flex-1">Ausgabe</TabsTrigger>
        </TabsList>

        {/* ── Video Tab ─────────────────────────────────────────────────── */}
        {!isAudioOnly && (
          <TabsContent value="video" className="space-y-4 pt-2">
            {/* Codec */}
            <div className="space-y-1.5">
              <Label>Video-Codec</Label>
              <Select value={settings.videoSettings.codec} onValueChange={(v) => setVideoSettings({ codec: v as ConversionSettings["videoSettings"]["codec"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_CODECS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {settings.videoSettings.codec !== "copy" && !isGif && (
              <>
                {/* Resolution */}
                <div className="space-y-1.5">
                  <Label>Auflösung</Label>
                  <Select value={settings.videoSettings.resolution} onValueChange={(v) => setVideoSettings({ resolution: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Framerate */}
                <div className="space-y-1.5">
                  <Label>Framerate</Label>
                  <Select value={settings.videoSettings.framerate} onValueChange={(v) => setVideoSettings({ framerate: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FRAMERATES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate Control */}
                <div className="space-y-2">
                  <Label>Qualitätsmodus</Label>
                  <div className="flex gap-1">
                    {(["crf", "cbr", "vbr"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setVideoSettings({ rateControl: mode })}
                        className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                          settings.videoSettings.rateControl === mode
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {settings.videoSettings.rateControl === "crf" ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>CRF (Qualität)</span>
                        <span className="font-mono font-bold text-foreground">{settings.videoSettings.crfValue}</span>
                      </div>
                      <Slider
                        min={0}
                        max={51}
                        step={1}
                        value={[settings.videoSettings.crfValue]}
                        onValueChange={([v]) => setVideoSettings({ crfValue: v })}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 = beste Qualität</span>
                        <span>51 = kleinste Datei</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Bitrate</Label>
                      <Select value={settings.videoSettings.bitrate} onValueChange={(v) => setVideoSettings({ bitrate: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VIDEO_BITRATES.map((b) => (
                            <SelectItem key={b} value={b}>{b.replace("k", " kbps").replace("000 kbps", " Mbps")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Preset */}
                {["libx264", "libx265", "libvpx-vp9"].includes(settings.videoSettings.codec) && (
                  <div className="space-y-1.5">
                    <Label>Encoding-Preset</Label>
                    <Select value={settings.videoSettings.preset} onValueChange={(v) => setVideoSettings({ preset: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENCODING_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Advanced */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-xs text-muted-foreground">Erweitert</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Pixel-Format</Label>
                        <Select value={settings.videoSettings.pixFmt} onValueChange={(v) => setVideoSettings({ pixFmt: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yuv420p">yuv420p (Standard, max. Kompatibilität)</SelectItem>
                            <SelectItem value="yuv422p">yuv422p</SelectItem>
                            <SelectItem value="yuv444p">yuv444p (höchste Qualität)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Hardware-Beschleunigung</Label>
                        <Select value={settings.videoSettings.hwAccel} onValueChange={(v) => setVideoSettings({ hwAccel: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {HW_ACCELS.map((h) => (
                              <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}
          </TabsContent>
        )}

        {/* ── Audio Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="audio" className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Audio-Codec</Label>
            <Select value={settings.audioSettings.codec} onValueChange={(v) => setAudioSettings({ codec: v as ConversionSettings["audioSettings"]["codec"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIO_CODECS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {settings.audioSettings.codec !== "copy" && settings.audioSettings.codec !== "flac" && settings.audioSettings.codec !== "pcm_s16le" && (
            <div className="space-y-1.5">
              <Label>Audio-Bitrate</Label>
              <Select value={settings.audioSettings.bitrate} onValueChange={(v) => setAudioSettings({ bitrate: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIO_BITRATES.map((b) => (
                    <SelectItem key={b} value={b}>{b.replace("k", " kbps")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Sample Rate</Label>
            <Select value={settings.audioSettings.sampleRate} onValueChange={(v) => setAudioSettings({ sampleRate: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SAMPLE_RATES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kanäle</Label>
            <Select value={settings.audioSettings.channels} onValueChange={(v) => setAudioSettings({ channels: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* ── Trim Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="trim" className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.trim.enabled}
              onCheckedChange={(v) => setTrim({ enabled: v })}
              id="trim-enabled"
            />
            <label htmlFor="trim-enabled" className="text-sm cursor-pointer">Schnitt aktivieren</label>
          </div>

          {settings.trim.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Startzeit (HH:MM:SS)</Label>
                <Input
                  placeholder="00:00:00"
                  value={settings.trim.startTime}
                  onChange={(e) => setTrim({ startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Endzeit (HH:MM:SS)</Label>
                <Input
                  placeholder="00:00:00"
                  value={settings.trim.endTime}
                  onChange={(e) => setTrim({ endTime: e.target.value })}
                />
              </div>
            </div>
          )}
          {!settings.trim.enabled && (
            <p className="text-xs text-muted-foreground">
              Aktiviere den Schnitt um Start- und Endpunkt festzulegen.
            </p>
          )}
        </TabsContent>

        {/* ── Output Tab ────────────────────────────────────────────────── */}
        <TabsContent value="output" className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Ausgabeordner</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Standard: Quellordner"
                value={settings.outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={pickOutputDir}>
                …
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dateiname-Suffix</Label>
            <Input
              value={settings.outputFileSuffix}
              onChange={(e) => setOutputFileSuffix(e.target.value)}
              placeholder="_converted"
            />
          </div>

          <div className="rounded-md bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Vorschau:</p>
            <p className="text-xs font-mono text-foreground break-all">{outputPreview}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Type imports for codec
import type { ConversionSettings } from "../lib/types";
