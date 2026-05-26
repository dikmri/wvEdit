import { writable, get } from "svelte/store";
import type { WvEditProject, MediaAsset, Clip, Track } from "../types/project";
import { createNewProject } from "../domain/project";
import {
  splitClip,
  deleteClipsFromTrack,
  moveClip,
  trimClipLeft,
  trimClipRight,
  recalcTimelineDuration,
  hasOverlap,
} from "../domain/operations";
import { historyStore } from "./history-store";

function createProjectStore() {
  const store = writable<WvEditProject>(createNewProject());
  const { subscribe, set, update } = store;

  function _get() {
    return get(store);
  }

  function _snapshot() {
    return JSON.parse(JSON.stringify(_get())) as WvEditProject;
  }

  function _saveHistory() {
    historyStore.push(_snapshot());
  }

  function loadProject(project: WvEditProject) {
    set(project);
    historyStore.clear();
  }

  function addAsset(asset: MediaAsset) {
    update((p) => ({ ...p, assets: [...p.assets, asset] }));
  }

  function removeAsset(assetId: string) {
    update((p) => ({ ...p, assets: p.assets.filter((a) => a.id !== assetId) }));
  }

  /** タイムラインにクリップを追加 */
  function addClipToTrack(trackId: string, clip: Clip) {
    _saveHistory();
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        // 重なりがある場合は末尾へ配置
        if (hasOverlap(t.clips, clip)) {
          const maxEnd = t.clips.reduce((m, c) => Math.max(m, c.timelineEnd), 0);
          const duration = clip.timelineEnd - clip.timelineStart;
          const adjustedClip = { ...clip, timelineStart: maxEnd, timelineEnd: maxEnd + duration };
          return { ...t, clips: [...t.clips, adjustedClip] };
        }
        return { ...t, clips: [...t.clips, clip] };
      });
      const newTimeline = { ...p.timeline, tracks };
      return {
        ...p,
        timeline: { ...newTimeline, duration: recalcTimelineDuration(newTimeline) },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function updateClip(trackId: string, updatedClip: Clip) {
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return { ...t, clips: t.clips.map((c) => (c.id === updatedClip.id ? updatedClip : c)) };
      });
      const newTimeline = { ...p.timeline, tracks };
      return { ...p, timeline: { ...newTimeline, duration: recalcTimelineDuration(newTimeline) } };
    });
  }

  function deleteSelectedClips() {
    _saveHistory();
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => {
        const selected = new Set(t.clips.filter((c) => c.selected).map((c) => c.id));
        return selected.size > 0 ? deleteClipsFromTrack(t, selected) : t;
      });
      const newTimeline = { ...p.timeline, tracks };
      return {
        ...p,
        timeline: { ...newTimeline, duration: recalcTimelineDuration(newTimeline) },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function splitClipAtTime(clipId: string, currentTime: number, fps: number) {
    _saveHistory();
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => {
        const idx = t.clips.findIndex((c) => c.id === clipId);
        if (idx === -1) return t;
        const result = splitClip(t.clips[idx], currentTime, fps);
        if (!result) return t;
        const [left, right] = result;
        const newClips = [...t.clips.slice(0, idx), left, right, ...t.clips.slice(idx + 1)];
        return { ...t, clips: newClips };
      });
      const newTimeline = { ...p.timeline, tracks };
      return {
        ...p,
        timeline: { ...newTimeline, duration: recalcTimelineDuration(newTimeline) },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function moveClipInTrack(trackId: string, clipId: string, newStart: number, fps: number) {
    _saveHistory();
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const clips = t.clips.map((c) => {
          if (c.id !== clipId) return c;
          const moved = moveClip(c, newStart, fps);
          if (hasOverlap(t.clips, moved)) return c;
          return moved;
        });
        return { ...t, clips };
      });
      const newTimeline = { ...p.timeline, tracks };
      return {
        ...p,
        timeline: { ...newTimeline, duration: recalcTimelineDuration(newTimeline) },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function trimClipInTrack(
    trackId: string,
    clipId: string,
    side: "left" | "right",
    newPos: number,
    fps: number
  ) {
    _saveHistory();
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const clips = t.clips.map((c) => {
          if (c.id !== clipId) return c;
          return side === "left" ? trimClipLeft(c, newPos, fps) : trimClipRight(c, newPos, fps);
        });
        return { ...t, clips };
      });
      const newTimeline = { ...p.timeline, tracks };
      return {
        ...p,
        timeline: { ...newTimeline, duration: recalcTimelineDuration(newTimeline) },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function selectClip(clipId: string, multi = false) {
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => ({
          ...c,
          selected: multi ? (c.id === clipId ? !c.selected : c.selected) : c.id === clipId,
        })),
      }));
      return { ...p, timeline: { ...p.timeline, tracks } };
    });
  }

  function clearSelection() {
    update((p) => {
      const tracks = p.timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => ({ ...c, selected: false })),
      }));
      return { ...p, timeline: { ...p.timeline, tracks } };
    });
  }

  function getSelectedClips(): Clip[] {
    const p = _get();
    return p.timeline.tracks.flatMap((t) => t.clips.filter((c) => c.selected));
  }

  function getTrackForClip(clipId: string): Track | undefined {
    return _get().timeline.tracks.find((t) => t.clips.some((c) => c.id === clipId));
  }

  function undo() {
    const prev = historyStore.undo(_snapshot());
    if (prev) set(prev);
  }

  function redo() {
    const next = historyStore.redo(_snapshot());
    if (next) set(next);
  }

  return {
    subscribe,
    loadProject,
    addAsset,
    removeAsset,
    addClipToTrack,
    updateClip,
    deleteSelectedClips,
    splitClipAtTime,
    moveClipInTrack,
    trimClipInTrack,
    selectClip,
    clearSelection,
    getSelectedClips,
    getTrackForClip,
    undo,
    redo,
  };
}

export const projectStore = createProjectStore();
