import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { WvEditProject, Clip } from "../types/project";
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

      // タイムライン上のビデオクリップを収集
      const videoTrack = project.timeline.tracks.find((t) => t.type === "video");
      if (!videoTrack || videoTrack.clips.length === 0) {
        return { success: false, error: "タイムラインに動画クリップがありません" };
      }

      const clips = [...videoTrack.clips].sort((a, b) => a.timelineStart - b.timelineStart);

      onProgress({ stage: "encoding", progress: 10, message: "動画ファイルを読み込み中..." });

      // 各クリップの素材ファイルをffmpegのVFSに書き込む
      const assetMap = new Map<string, MediaAsset>();
      for (const asset of project.assets) {
        assetMap.set(asset.id, asset);
      }

      // 入力ファイル群
      const inputFiles: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const asset = assetMap.get(clip.assetId);
        if (!asset?.objectUrl) {
          return { success: false, error: `クリップ「${clip.name}」の素材ファイルが見つかりません。再リンクしてください。` };
        }
        const fileName = `input_${i}.mp4`;
        const fileData = await fetchFile(asset.objectUrl);
        await ffmpeg.writeFile(fileName, fileData);
        inputFiles.push(fileName);
      }

      onProgress({ stage: "encoding", progress: 30, message: "クリップを切り出し中..." });

      // 各クリップをtrim
      const trimmedFiles: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const outFile = `trimmed_${i}.mp4`;
        const duration = clip.sourceEnd - clip.sourceStart;
        await ffmpeg.exec([
          "-ss", String(clip.sourceStart),
          "-i", inputFiles[i],
          "-t", String(duration),
          "-c:v", "libx264",
          "-c:a", "aac",
          "-preset", "ultrafast",
          "-avoid_negative_ts", "make_zero",
          outFile,
        ]);
        trimmedFiles.push(outFile);
        const p = 30 + (i / clips.length) * 40;
        onProgress({ stage: "encoding", progress: p, message: `クリップ ${i + 1}/${clips.length} を処理中...` });
      }

      onProgress({ stage: "muxing", progress: 75, message: "クリップを結合中..." });

      let outputFile: string;
      if (trimmedFiles.length === 1) {
        outputFile = trimmedFiles[0];
      } else {
        // concat demuxer でクリップを結合
        const concatList = trimmedFiles.map((f) => `file '${f}'`).join("\n");
        const encoder = new TextEncoder();
        await ffmpeg.writeFile("concat.txt", encoder.encode(concatList));

        outputFile = "output.mp4";
        await ffmpeg.exec([
          "-f", "concat",
          "-safe", "0",
          "-i", "concat.txt",
          "-c:v", "libx264",
          "-c:a", "aac",
          "-preset", "ultrafast",
          "-movflags", "+faststart",
          outputFile,
        ]);
      }

      onProgress({ stage: "done", progress: 95, message: "ファイルを生成中..." });

      const data = await ffmpeg.readFile(outputFile);
      const blob = new Blob([data], { type: "video/mp4" });

      onProgress({ stage: "done", progress: 100, message: "書き出し完了" });

      return { success: true, blob };
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      return { success: false, error: `書き出しに失敗しました: ${message}` };
    }
  }
}

// 型のみimport用（TS用）
import type { MediaAsset } from "../types/project";
