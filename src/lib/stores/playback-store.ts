import { writable } from "svelte/store";

/**
 * 再生ヘッド位置専用ストア。
 * RAF から 60fps で更新。Playhead コンポーネントのみ購読し、
 * Timeline 全体の再描画を回避する。
 */
export const playheadTime = writable(0);

export type PlaybackState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;
  previewScale: number;
};

function createPlaybackStore() {
  const { subscribe, set, update } = writable<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    fps: 30,
    previewScale: 1,
  });

  function play() {
    update((s) => ({ ...s, isPlaying: true }));
  }

  function pause() {
    update((s) => ({ ...s, isPlaying: false }));
  }

  function togglePlay() {
    update((s) => ({ ...s, isPlaying: !s.isPlaying }));
  }

  function seek(time: number) {
    update((s) => ({ ...s, currentTime: Math.max(0, Math.min(time, s.duration)) }));
  }

  function setDuration(duration: number) {
    update((s) => ({ ...s, duration }));
  }

  function setFps(fps: number) {
    update((s) => ({ ...s, fps }));
  }

  function setCurrentTime(time: number) {
    update((s) => ({ ...s, currentTime: time }));
  }

  function stepForward() {
    update((s) => {
      const next = Math.min(s.currentTime + 1 / s.fps, s.duration);
      return { ...s, currentTime: next, isPlaying: false };
    });
  }

  function stepBackward() {
    update((s) => {
      const prev = Math.max(s.currentTime - 1 / s.fps, 0);
      return { ...s, currentTime: prev, isPlaying: false };
    });
  }

  return { subscribe, play, pause, togglePlay, seek, setDuration, setFps, setCurrentTime, stepForward, stepBackward };
}

export const playbackStore = createPlaybackStore();
