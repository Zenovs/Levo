import type { ConversionSettings } from "./types";

/**
 * Build the full FFmpeg argument array from settings.
 * Returns args WITHOUT the `ffmpeg` binary itself.
 * e.g.  ["-i", "/path/in.mp4", "-c:v", "libx264", ..., "/path/out.mp4"]
 */
export function buildFFmpegArgs(
  inputPath: string,
  outputPath: string,
  settings: ConversionSettings,
  durationSeconds?: number
): string[] {
  const args: string[] = [];
  const { videoSettings: vs, audioSettings: as_, trim, outputFormat } = settings;

  // ── Hardware acceleration ──────────────────────────────────────────────────
  if (vs.hwAccel && vs.hwAccel !== "none") {
    if (vs.hwAccel === "nvenc") {
      args.push("-hwaccel", "cuda");
    } else if (vs.hwAccel === "qsv") {
      args.push("-hwaccel", "qsv");
    } else if (vs.hwAccel === "videotoolbox") {
      args.push("-hwaccel", "videotoolbox");
    } else if (vs.hwAccel === "vaapi") {
      args.push("-hwaccel", "vaapi", "-hwaccel_output_format", "vaapi");
    }
  }

  // ── Trim: seek before input for accurate fast seek ─────────────────────────
  if (trim.enabled && trim.startTime) {
    args.push("-ss", trim.startTime);
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  args.push("-i", inputPath);

  // ── Trim: end time ─────────────────────────────────────────────────────────
  if (trim.enabled && trim.endTime) {
    args.push("-to", trim.endTime);
  }

  const isAudioOnly = outputFormat === "mp3" || outputFormat === "aac" ||
    outputFormat === "flac" || outputFormat === "wav" ||
    outputFormat === "ogg" || outputFormat === "m4a" ||
    outputFormat === "opus" || outputFormat === "ac3";

  const isGif  = outputFormat === "gif";
  const isHls  = outputFormat === "m3u8";
  const hls    = settings.hlsSettings;

  // ── HLS: special handling — output is a .m3u8 playlist + .ts segments ────
  if (isHls) {
    args.push("-c:v", vs.codec === "copy" ? "copy" : "libx264");
    if (vs.codec !== "copy") {
      args.push("-crf", String(vs.crfValue), "-preset", vs.preset);
    }
    args.push("-c:a", "aac", "-b:a", as_.bitrate);
    args.push("-f", "hls");
    args.push("-hls_time",      String(hls.segmentDuration));
    args.push("-hls_list_size", String(hls.listSize));
    if (hls.playlistType !== "none") {
      args.push("-hls_playlist_type", hls.playlistType);
    }
    args.push("-start_number", String(hls.startNumber));
    args.push("-hls_segment_filename", outputPath.replace(".m3u8", "_%03d.ts"));
    args.push("-y", outputPath);
    return args;
  }

  // ── Video codec / stream copy ──────────────────────────────────────────────
  if (isAudioOnly) {
    args.push("-vn"); // no video
  } else if (isGif) {
    // GIF palette generation
    args.push("-vf", buildGifFilter(vs.resolution));
    args.push("-loop", "0");
  } else if (vs.codec === "copy") {
    args.push("-c:v", "copy");
  } else {
    // Map codec to actual ffmpeg codec name (hwaccel variants)
    let codecName: string = vs.codec;
    if (vs.hwAccel === "nvenc") {
      if (vs.codec === "libx264") codecName = "h264_nvenc";
      else if (vs.codec === "libx265") codecName = "hevc_nvenc";
    } else if (vs.hwAccel === "qsv") {
      if (vs.codec === "libx264") codecName = "h264_qsv";
      else if (vs.codec === "libx265") codecName = "hevc_qsv";
    } else if (vs.hwAccel === "videotoolbox") {
      if (vs.codec === "libx264") codecName = "h264_videotoolbox";
      else if (vs.codec === "libx265") codecName = "hevc_videotoolbox";
    } else if (vs.hwAccel === "vaapi") {
      if (vs.codec === "libx264") codecName = "h264_vaapi";
      else if (vs.codec === "libx265") codecName = "hevc_vaapi";
    }

    args.push("-c:v", codecName);

    // Rate control
    if (vs.rateControl === "crf") {
      if (vs.codec === "libvpx-vp9") {
        args.push("-crf", String(vs.crfValue), "-b:v", "0");
      } else if (vs.codec === "libaom-av1") {
        args.push("-crf", String(vs.crfValue), "-b:v", "0");
      } else {
        args.push("-crf", String(vs.crfValue));
      }
    } else if (vs.rateControl === "cbr" || vs.rateControl === "vbr") {
      args.push("-b:v", vs.bitrate);
      if (vs.rateControl === "vbr") {
        args.push("-maxrate", vs.bitrate, "-bufsize", `${parseInt(vs.bitrate) * 2}k`);
      }
    }

    // Preset (only for software encoders that support it)
    if (vs.preset && !["prores_ks", "gif", "mpeg4"].includes(vs.codec) &&
        !vs.hwAccel?.includes("nvenc") && !vs.hwAccel?.includes("qsv")) {
      args.push("-preset", vs.preset);
    }

    // Video filters (scale / framerate)
    const vfilters: string[] = [];

    if (vs.resolution !== "source" && vs.resolution !== "custom") {
      const [w, h] = vs.resolution.split("x");
      // Keep aspect ratio
      vfilters.push(`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`);
    }

    if (vs.pixFmt && vs.pixFmt !== "source") {
      args.push("-pix_fmt", vs.pixFmt);
    }

    if (vfilters.length > 0) {
      args.push("-vf", vfilters.join(","));
    }

    if (vs.framerate !== "source") {
      args.push("-r", vs.framerate);
    }
  }

  // ── Audio codec ────────────────────────────────────────────────────────────
  if (!isGif) {
    if (as_.codec === "copy") {
      args.push("-c:a", "copy");
    } else {
      args.push("-c:a", as_.codec);

      if (as_.bitrate && as_.codec !== "flac" && as_.codec !== "pcm_s16le") {
        args.push("-b:a", as_.bitrate);
      }

      if (as_.sampleRate !== "source") {
        args.push("-ar", as_.sampleRate);
      }

      if (as_.channels !== "source") {
        args.push("-ac", as_.channels);
      }
    }
  } else {
    args.push("-an"); // no audio for GIF
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  // Overwrite output file without asking
  args.push("-y");

  args.push(outputPath);

  void durationSeconds; // used externally for progress calc
  return args;
}

function buildGifFilter(resolution: string): string {
  if (resolution === "source") {
    return "fps=15,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse";
  }
  const [w] = resolution.split("x");
  return `fps=15,scale=${w}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
}

/** Build a human-readable command string for display */
export function buildFFmpegCommand(
  inputPath: string,
  outputPath: string,
  settings: ConversionSettings,
  durationSeconds?: number
): string {
  const args = buildFFmpegArgs(inputPath, outputPath, settings, durationSeconds);
  // Quote paths that contain spaces
  const quotedArgs = args.map((a) =>
    a.includes(" ") ? `"${a}"` : a
  );
  return `ffmpeg ${quotedArgs.join(" ")}`;
}

/** Default settings */
export function defaultConversionSettings(): ConversionSettings {
  return {
    outputFormat: "mp4",
    videoSettings: {
      codec: "libx264",
      resolution: "source",
      framerate: "source",
      rateControl: "crf",
      crfValue: 23,
      bitrate: "4000k",
      preset: "medium",
      pixFmt: "yuv420p",
      hwAccel: "none",
    },
    audioSettings: {
      codec: "aac",
      bitrate: "192k",
      sampleRate: "source",
      channels: "source",
    },
    trim: {
      enabled: false,
      startTime: "",
      endTime: "",
    },
    hlsSettings: {
      segmentDuration: 6,
      listSize: 0,
      playlistType: "vod",
      startNumber: 0,
    },
    outputDir: "",
    outputFileSuffix: "_converted",
  };
}
