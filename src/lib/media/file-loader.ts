import type { MediaAsset } from "../types/project";

const SUPPORTED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const SUPPORTED_AUDIO = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/aac"];
const SUPPORTED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function isSupportedMedia(mimeType: string): boolean {
  return (
    SUPPORTED_VIDEO.includes(mimeType) ||
    SUPPORTED_AUDIO.includes(mimeType) ||
    SUPPORTED_IMAGE.includes(mimeType)
  );
}

export function getMediaType(mimeType: string): "video" | "audio" | "image" {
  if (SUPPORTED_VIDEO.includes(mimeType)) return "video";
  if (SUPPORTED_AUDIO.includes(mimeType)) return "audio";
  return "image";
}

/** VideoElementを使って動画のメタデータを取得する */
export function readVideoMetadata(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const data = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      URL.revokeObjectURL(url);
      resolve(data);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("動画メタデータの読み込みに失敗しました"));
    };
    video.src = url;
  });
}

/** Imageを使って画像のサイズを取得する */
export function readImageMetadata(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像メタデータの読み込みに失敗しました"));
    };
    img.src = url;
  });
}

/** AudioElementを使って音声のdurationを取得する */
export function readAudioMetadata(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: audio.duration });
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("音声メタデータの読み込みに失敗しました"));
    };
    audio.src = url;
  });
}

export async function loadMediaFile(file: File): Promise<MediaAsset> {
  if (!isSupportedMedia(file.type)) {
    throw new Error(
      `この形式は対応していません: ${file.type}\nMP4/H.264形式への変換をお試しください。`
    );
  }

  const type = getMediaType(file.type);
  const objectUrl = URL.createObjectURL(file);
  let duration = 0;
  let width: number | undefined;
  let height: number | undefined;

  try {
    if (type === "video") {
      const meta = await readVideoMetadata(file);
      duration = meta.duration;
      width = meta.width;
      height = meta.height;
    } else if (type === "audio") {
      const meta = await readAudioMetadata(file);
      duration = meta.duration;
    } else if (type === "image") {
      const meta = await readImageMetadata(file);
      width = meta.width;
      height = meta.height;
      duration = 0;
    }
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw e;
  }

  return {
    id: crypto.randomUUID(),
    type,
    name: file.name,
    fileName: file.name,
    objectUrl,
    duration,
    width,
    height,
    size: file.size,
    mimeType: file.type,
    createdAt: new Date().toISOString(),
  };
}
