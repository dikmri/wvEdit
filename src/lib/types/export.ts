import type { WvEditProject } from "./project";

export type ExportFormat = "mp4";
export type VideoCodec = "h264";
export type AudioCodec = "aac";

export type ExportOptions = {
  format: ExportFormat;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  width: number;
  height: number;
  fps: number;
  videoBitrate?: string;
  audioBitrate?: string;
};

export type ExportProgress = {
  stage: "preparing" | "encoding" | "muxing" | "done" | "error";
  progress: number;
  message: string;
};

export type ExportResult = {
  success: boolean;
  blob?: Blob;
  error?: string;
};

export interface Exporter {
  export(
    project: WvEditProject,
    options: ExportOptions,
    onProgress: (p: ExportProgress) => void
  ): Promise<ExportResult>;
}
