<script lang="ts">
  import { projectStore } from "../../stores/project-store";
  import { playbackStore, playheadTime } from "../../stores/playback-store";
  import { uiStore } from "../../stores/ui-store";
  import TimelineRuler from "./TimelineRuler.svelte";
  import TimelineTrack from "./TimelineTrack.svelte";
  import Playhead from "./Playhead.svelte";
  import type { MediaAsset } from "../../types/project";
  import { pxToSeconds, secondsToPx } from "../../domain/time";

  const TRACK_LABEL_WIDTH = 80;
  const RULER_HEIGHT = 24;
  const TRACK_HEIGHT = 48;

  $: zoom = $uiStore.timelineZoom;
  $: fps = $projectStore.settings.fps;
  $: tracks = $projectStore.timeline.tracks;
  $: duration = $projectStore.timeline.duration;
  // currentTime は Playhead が playheadTime を直接購読するため不要

  let scrollLeft = 0;
  let timelineEl: HTMLElement;

  $: totalHeight = RULER_HEIGHT + tracks.length * TRACK_HEIGHT;

  function onRulerClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    playbackStore.seek(pxToSeconds(x, zoom));
  }

  function onClipSelect(e: CustomEvent<{ clipId: string; multi: boolean }>) {
    projectStore.selectClip(e.detail.clipId, e.detail.multi);
  }

  function onClipMove(e: CustomEvent<{ trackId: string; clipId: string; newStart: number }>) {
    projectStore.moveClipInTrack(e.detail.trackId, e.detail.clipId, e.detail.newStart, fps);
  }

  function onClipTrim(e: CustomEvent<{ trackId: string; clipId: string; side: "left" | "right"; newPos: number }>) {
    projectStore.trimClipInTrack(e.detail.trackId, e.detail.clipId, e.detail.side, e.detail.newPos, fps);
  }

  function onDropAsset(e: CustomEvent<{ trackId: string; assetId: string; time: number }>) {
    const { trackId, assetId, time } = e.detail;
    const asset = $projectStore.assets.find((a) => a.id === assetId);
    if (!asset) return;

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    // 互換性チェック: video/image → video track, audio → audio track
    if (track.type === "video" && asset.type !== "video" && asset.type !== "image") return;
    if (track.type === "audio" && asset.type !== "audio") return;
    if (track.type === "text" || track.type === "subtitle") return;

    const DEFAULT_IMAGE_DURATION = 5;
    const duration = asset.duration > 0 ? asset.duration : DEFAULT_IMAGE_DURATION;

    const clip = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      type: asset.type as "video" | "audio" | "image",
      trackId,
      timelineStart: time,
      timelineEnd: time + duration,
      sourceStart: 0,
      sourceEnd: duration,
      name: asset.name,
      selected: false,
      audio: { volume: 1, muted: false, fadeIn: 0, fadeOut: 0 },
    };
    projectStore.addClipToTrack(trackId, clip);
  }

  function onTimelineClick(e: CustomEvent<{ time: number }>) {
    playbackStore.seek(e.detail.time);
    projectStore.clearSelection();
  }

  function onScroll(e: Event) {
    scrollLeft = (e.target as HTMLElement).scrollLeft;
  }
</script>

<div class="flex flex-col h-full bg-dark-800 select-none">
  <!-- ツールバー -->
  <div class="flex items-center gap-2 px-3 py-1 border-b border-dark-600 bg-dark-800">
    <span class="text-xs text-gray-500">ズーム:</span>
    <button class="btn-ghost text-xs" on:click={() => uiStore.zoomOut()}>−</button>
    <span class="text-xs text-gray-400 w-12 text-center">{Math.round(zoom)}%</span>
    <button class="btn-ghost text-xs" on:click={() => uiStore.zoomIn()}>＋</button>
    <input
      type="range"
      min="20"
      max="500"
      step="5"
      value={zoom}
      class="w-20 accent-accent-blue"
      on:input={(e) => uiStore.setZoom(Number((e.target as HTMLInputElement).value))}
    />
  </div>

  <!-- タイムライン本体 -->
  <div class="flex flex-1 overflow-hidden">
    <!-- トラックラベル -->
    <div
      class="flex-shrink-0 bg-dark-800 border-r border-dark-600 z-10"
      style="width: {TRACK_LABEL_WIDTH}px;"
    >
      <!-- ルーラーの高さ分余白 -->
      <div style="height: {RULER_HEIGHT}px;" class="border-b border-dark-600"></div>
      {#each tracks as track}
        {@const iconColor = track.type === "video" ? "text-blue-400" : track.type === "audio" ? "text-green-400" : track.type === "subtitle" ? "text-orange-400" : "text-purple-400"}
        {@const icon = track.type === "video" ? "▶" : track.type === "audio" ? "♪" : track.type === "subtitle" ? "字" : "T"}
        <div
          class="flex items-center gap-1 px-2 border-b border-dark-600"
          style="height: {TRACK_HEIGHT}px;"
        >
          <span class="text-xs font-bold flex-shrink-0 {iconColor}">{icon}</span>
          <span class="text-xs text-gray-400 truncate">{track.name}</span>
        </div>
      {/each}
    </div>

    <!-- スクロール可能なタイムライン -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      bind:this={timelineEl}
      class="flex-1 overflow-auto relative"
      on:scroll={onScroll}
    >
      <!-- ルーラー -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div on:click={onRulerClick} class="cursor-pointer sticky top-0 z-10">
        <TimelineRuler {duration} {zoom} />
      </div>

      <!-- トラック群 + 再生ヘッド -->
      <div class="relative">
        {#each tracks as track (track.id)}
          <TimelineTrack
            {track}
            {zoom}
            {duration}
            on:clip-select={onClipSelect}
            on:clip-move={onClipMove}
            on:clip-trim={onClipTrim}
            on:drop-asset={onDropAsset}
            on:timeline-click={onTimelineClick}
          />
        {/each}

        <!-- 再生ヘッド: playheadTime ストアを内部で直接購読 -->
        <Playhead {zoom} height={tracks.length * TRACK_HEIGHT} />
      </div>
    </div>
  </div>
</div>
