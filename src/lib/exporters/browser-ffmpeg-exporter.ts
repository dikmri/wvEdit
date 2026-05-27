import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { WvEditProject, Clip, MediaAsset } from "../types/project";
import type { ExportOptions, ExportProgress, ExportResult, Exporter } from "../types/export";

export class BrowserFfmpegExporter implements Exporter {
  private ffmpeg: FFmpeg | null = null;

  private async getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;

    const ffmpeg = new FFmpeg();
    if (onLog) {
      ffmpeg.on("log", ({ message }) => onLog(message));
    }

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  async export(
    project: WvEditProject,
    options: ExportOptions,
    onProgress: (p: ExportProgress) => void
  ): Promise<ExportResult> {
    try {
      onProgress({ stage: "preparing", progress: 0, message: "ffmpeg.wasmを初期化中..." });

      const ffmpeg = await this.getFFmpeg();

      const videoTrack = project.timeline.tracks.find((t) => t.type === "video");
      const audioTrack = project.timeline.tracks.find((t) => t.type === "audio");

      const videoClips = [...(videoTrack?.clips ?? [])].sort((a, b) => a.timelineStart - b.timelineStart);
      const bgmClips = [...(audioTrack?.clips ?? [])].sort((a, b) => a.timelineStart - b.timelineStart);

      if (videoClips.length === 0) {
        return { success: false, error: "タイムラインに動画/画像クリップがありません" };
      }

      const assetMap = new Map<string, MediaAsset>(project.assets.map((a) => [a.id, a]));
      const { width: W, height: H, fps: FPS } = options;
      const sampleRate = project.settings.sampleRate ?? 48000;
      const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black`;

      onProgress({ stage: "encoding", progress: 5, message: "動画ファイルを読み込み中..." });

      // ===== 1. 各ビデオ/画像クリップを書き出し + トリミング =====
      const trimmedFiles: string[] = [];

      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        const asset = assetMap.get(clip.assetId);
        if (!asset?.objectUrl) {
          return { success: false, error: `クリップ「${clip.name}」の素材ファイルが見つかりません。再リンクしてください。` };
        }

        const ext = clip.type === "image" ? "img" : "mp4";
        const inFile = `input_${i}.${ext}`;
        const outFile = `trimmed_${i}.mp4`;
        const clipDuration = clip.sourceEnd - clip.sourceStart;

        await ffmpeg.writeFile(inFile, await fetchFile(asset.objectUrl));

        if (clip.type === "image") {
          await ffmpeg.exec([
            "-loop", "1",
            "-t", String(clipDuration),
            "-i", inFile,
            "-f", "lavfi",
            "-t", String(clipDuration),
            "-i", `anullsrc=r=${sampleRate}:cl=stereo`,
            "-vf", vf,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-r", String(FPS),
            "-shortest",
            outFile,
          ]);
        } else {
          const volume = clip.audio?.volume ?? 1;
          const args: string[] = [
            "-ss", String(clip.sourceStart),
            "-i", inFile,
            "-t", String(clipDuration),
            "-vf", vf,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-preset", "ultrafast",
            "-avoid_negative_ts", "make_zero",
          ];
          if (volume !== 1) args.push("-af", `volume=${volume}`);
          args.push(outFile);
          await ffmpeg.exec(args);
        }

        trimmedFiles.push(outFile);
        const p = 5 + ((i + 1) / videoClips.length) * 45;
        onProgress({ stage: "encoding", progress: p, message: `クリップ ${i + 1}/${videoClips.length} を処理中...` });
      }

      onProgress({ stage: "muxing", progress: 55, message: "クリップを結合中..." });

      // ===== 2. コンカット =====
      let concatOutput: string;
      if (trimmedFiles.length === 1) {
        concatOutput = trimmedFiles[0];
      } else {
        const concatList = trimmedFiles.map((f) => `file '${f}'`).join("\n");
        await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));
        concatOutput = "concat_out.mp4";
        await ffmpeg.exec([
          "-f", "concat",
          "-safe", "0",
          "-i", "concat.txt",
          "-c", "copy",
          concatOutput,
        ]);
      }

      // ===== 3. BGM / SE ミックス =====
      let finalOutput: string;

      if (bgmClips.length === 0) {
        finalOutput = "output.mp4";
        await ffmpeg.exec([
          "-i", concatOutput,
          "-c", "copy",
          "-movflags", "+faststart",
          finalOutput,
        ]);
      } else {
        onProgress({ stage: "muxing", progress: 70, message: "BGMを読み込み中..." });

        const audioInputArgs: string[] = [];
        const validBgmClips: Clip[] = [];

        for (let i = 0; i < bgmClips.length; i++) {
          const clip = bgmClips[i];
          const asset = assetMap.get(clip.assetId);
          if (!asset?.objectUrl) continue;
          const aFile = `audio_${i}`;
          await ffmpeg.writeFile(aFile, await fetchFile(asset.objectUrl));
          audioInputArgs.push("-i", aFile);
          validBgmClips.push(clip);
        }

        if (validBgmClips.length === 0) {
          finalOutput = "output.mp4";
          await ffmpeg.exec(["-i", concatOutput, "-c", "copy", "-movflags", "+faststart", finalOutput]);
        } else {
          onProgress({ stage: "muxing", progress: 80, message: "BGMを合成中..." });

          const filterParts: string[] = [];
          const mixStreams: string[] = ["[0:a]"];

          for (let i = 0; i < validBgmClips.length; i++) {
            const clip = validBgmClips[i];
            const inputIdx = i + 1;
            const delayMs = Math.round(clip.timelineStart * 1000);
            const vol = clip.audio?.volume ?? 1;
            filterParts.push(
              `[${inputIdx}:a]atrim=start=${clip.sourceStart}:end=${clip.sourceEnd},adelay=${delayMs}|${delayMs},asetpts=PTS-STARTPTS,volume=${vol}[abgm${i}]`
            );
            mixStreams.push(`[abgm${i}]`);
          }
          filterParts.push(
            `${mixStreams.join("")}amix=inputs=${mixStreams.length}:normalize=0:dropout_transition=0[aout]`
          );

          finalOutput = "output.mp4";
          await ffmpeg.exec([
            "-i", concatOutput,
            ...audioInputArgs,
            "-filter_complex", filterParts.join(";"),
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-movflags", "+faststart",
            finalOutput,
          ]);
        }
      }

      onProgress({ stage: "done", progress: 95, message: "ファイルを生成中..." });

      const raw = await ffmpeg.readFile(finalOutput);
      const blob = new Blob([Uint8Array.from(raw as Uint8Array)], { type: "video/mp4" });

      onProgress({ stage: "done", progress: 100, message: "書き出し完了" });

      return { success: true, blob };
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      return { success: false, error: `書き出しに失敗しました: ${message}` };
    }
  }
}
