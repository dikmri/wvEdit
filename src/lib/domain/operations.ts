import type { Clip, Track, Timeline } from "../types/project";
import { snapToFrame } from "./time";

/** クリップを再生ヘッド位置で分割する。成功したら2つのClipを返す。 */
export function splitClip(
  clip: Clip,
  splitTime: number,
  fps: number
): [Clip, Clip] | null {
  const snapped = snapToFrame(splitTime, fps);
  if (snapped <= clip.timelineStart || snapped >= clip.timelineEnd) return null;

  const sourceSplit = clip.sourceStart + (snapped - clip.timelineStart);

  const left: Clip = {
    ...clip,
    id: crypto.randomUUID(),
    timelineEnd: snapped,
    sourceEnd: sourceSplit,
    selected: false,
  };

  const right: Clip = {
    ...clip,
    id: crypto.randomUUID(),
    timelineStart: snapped,
    sourceStart: sourceSplit,
    selected: false,
  };

  return [left, right];
}

/** クリップを削除したトラックを返す */
export function deleteClipsFromTrack(track: Track, clipIds: Set<string>): Track {
  return {
    ...track,
    clips: track.clips.filter((c) => !clipIds.has(c.id)),
  };
}

/** クリップの移動。重なりチェックはしない（MVPシンプル版） */
export function moveClip(clip: Clip, newStart: number, fps: number): Clip {
  const snapped = snapToFrame(Math.max(0, newStart), fps);
  const duration = clip.timelineEnd - clip.timelineStart;
  return {
    ...clip,
    timelineStart: snapped,
    timelineEnd: snapped + duration,
  };
}

/** クリップの左端トリミング */
export function trimClipLeft(clip: Clip, newStart: number, fps: number): Clip {
  const snapped = snapToFrame(newStart, fps);
  const delta = snapped - clip.timelineStart;
  if (snapped >= clip.timelineEnd - 1 / fps) return clip;
  return {
    ...clip,
    timelineStart: snapped,
    sourceStart: clip.sourceStart + delta,
  };
}

/** クリップの右端トリミング */
export function trimClipRight(clip: Clip, newEnd: number, fps: number): Clip {
  const snapped = snapToFrame(newEnd, fps);
  const delta = snapped - clip.timelineEnd;
  if (snapped <= clip.timelineStart + 1 / fps) return clip;
  return {
    ...clip,
    timelineEnd: snapped,
    sourceEnd: clip.sourceEnd + delta,
  };
}

/** タイムライン全体の総尺を再計算 */
export function recalcTimelineDuration(timeline: Timeline): number {
  let max = 0;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      if (clip.timelineEnd > max) max = clip.timelineEnd;
    }
  }
  return max;
}

/** 重複チェック: 同一トラック上でclipが他のclipと重なっていないか */
export function hasOverlap(clips: Clip[], newClip: Clip): boolean {
  for (const existing of clips) {
    if (existing.id === newClip.id) continue;
    if (newClip.timelineStart < existing.timelineEnd && newClip.timelineEnd > existing.timelineStart) {
      return true;
    }
  }
  return false;
}
