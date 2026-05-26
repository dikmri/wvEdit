/**
 * タイムコード変換ユーティリティ
 */

export function secondsToTimecode(seconds: number, fps: number): string {
  const totalFrames = Math.floor(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(seconds);
  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  return [
    String(hours).padStart(2, "0"),
    String(mins).padStart(2, "0"),
    String(secs).padStart(2, "0"),
    String(frames).padStart(2, "0"),
  ].join(":");
}

export function timecodeToSeconds(timecode: string, fps: number): number {
  const parts = timecode.split(":").map(Number);
  if (parts.length !== 4) return 0;
  const [hours, mins, secs, frames] = parts;
  return hours * 3600 + mins * 60 + secs + frames / fps;
}

/** ピクセル座標から時間へ変換 */
export function pxToSeconds(px: number, zoom: number): number {
  return px / zoom;
}

/** 時間からピクセル座標へ変換 */
export function secondsToPx(seconds: number, zoom: number): number {
  return seconds * zoom;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function snapToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps) / fps;
}
