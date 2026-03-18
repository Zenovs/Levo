import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, X, Download, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";

interface UpdateInfo {
  available: boolean;
  version?: string;
  currentVersion?: string;
  body?: string;
  downloadUrl?: string;
}

interface UpdateDialogProps {
  onClose: () => void;
}

export function UpdateDialog({ onClose }: UpdateDialogProps) {
  const [state, setState] = useState<"idle" | "checking" | "available" | "downloading" | "ready" | "error" | "up-to-date">("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    setState("checking");
    setError(null);
    try {
      const info = await invoke<UpdateInfo>("check_for_update");
      setUpdateInfo(info);
      if (info.available) {
        setState("available");
      } else {
        setState("up-to-date");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  async function downloadUpdate() {
    setState("downloading");
    setProgress(0);
    try {
      await invoke("download_and_install_update", {
        onProgress: (p: number) => setProgress(p),
      });
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  async function restartApp() {
    try {
      await invoke("restart_app");
    } catch (e) {
      console.error("Restart failed:", e);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 transition-colors hover:bg-[color:var(--bg-overlay)]"
          style={{ color: "var(--text-muted)" }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl p-2.5" style={{ background: "var(--primary-subtle)" }}>
            <RefreshCw className="h-5 w-5" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Software-Update</h2>
            {updateInfo?.currentVersion && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Aktuell: v{updateInfo.currentVersion}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">

          {state === "checking" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
              <p style={{ color: "var(--text-secondary)" }}>Auf Updates prüfen...</p>
            </div>
          )}

          {state === "up-to-date" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="rounded-full p-3" style={{ background: "var(--success-bg)" }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: "var(--success)" }} />
              </div>
              <div className="text-center">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Du bist aktuell!</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Version {updateInfo?.currentVersion} ist die neueste Version.
                </p>
              </div>
            </div>
          )}

          {state === "available" && updateInfo && (
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: "var(--primary-subtle)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm" style={{ color: "var(--primary)" }}>
                    Version {updateInfo.version} verfügbar
                  </span>
                  <Download className="h-4 w-4" style={{ color: "var(--primary)" }} />
                </div>
                {updateInfo.body && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {updateInfo.body.slice(0, 200)}{updateInfo.body.length > 200 ? "..." : ""}
                  </p>
                )}
              </div>
              <button
                onClick={downloadUpdate}
                className="w-full rounded-xl py-3 font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{
                  background: "var(--gradient-brand)",
                  color: "white",
                  boxShadow: "0 2px 12px var(--primary-glow)",
                }}
              >
                <Download className="h-4 w-4" />
                Update herunterladen & installieren
              </button>
            </div>
          )}

          {state === "downloading" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Wird heruntergeladen...</span>
                <span className="font-mono font-medium" style={{ color: "var(--primary)" }}>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-overlay)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300 progress-bar-animated"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                Bitte nicht schließen...
              </p>
            </div>
          )}

          {state === "ready" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-full p-3" style={{ background: "var(--success-bg)" }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: "var(--success)" }} />
              </div>
              <div className="text-center">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Update bereit!</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Neustart erforderlich um die neue Version zu aktivieren.
                </p>
              </div>
              <button
                onClick={restartApp}
                className="mt-2 w-full rounded-xl py-3 font-semibold text-sm transition-all active:scale-[0.98]"
                style={{ background: "var(--gradient-brand)", color: "white" }}
              >
                Jetzt neu starten
              </button>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ background: "var(--error-bg)", border: "1px solid var(--border)" }}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--error)" }}>Fehler</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      {error || "Unbekannter Fehler"}
                    </p>
                  </div>
                </div>
              </div>
              <a
                href="https://github.com/Zenovs/Levo/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                GitHub Releases öffnen
              </a>
              <button
                onClick={checkForUpdates}
                className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
                style={{ background: "var(--bg-overlay)", color: "var(--text-primary)" }}
              >
                Erneut versuchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
