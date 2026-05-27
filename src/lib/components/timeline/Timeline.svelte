<script lang="ts">
  import { projectStore } from "../../stores/project-store";
  import { playbackStore, playheadTime } from "../../stores/playback-store";
  import { uiStore } from "../../stores/ui-store";
  import TimelineRuler from "./TimelineRuler.svelte";
  import TimelineTrack from "./TimelineTrack.svelte";
  import Playhead from "./Playhead.svelte";
  import { pxToSeconds, secondsToPx } from "../../domain/time";
  import { get } from "svelte/store";

  const TRACK_LABEL_WIDTH = 80;
  const RULER_HEIGHT = 24;
  const TRACK_HEIGHT = 48;

  $: zoom = $uiStore.timelineZoom;
  $: fps = $projectStore.settings.fps;
  // テキスト/字幕トラックはクリップがある時のみ表示
  $: tracks = $projectStore.timeline.tracks.filter(
    (t) => t.type !== "text" && t.type !== "subtitle" || t.clips.length > 0
  );
  $: duration = $projectStore.timeline.duration;
  $: contentWidth = Math.max(secondsToPx(duration, zoom) + 200, 800);

  let timelineEl: HTMLElement;

  function onRulerClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    playbackStore.seek(pxToSeconds(x, zoom));
  }

  function onClipSelect(e: CustomEvent<{ clipId: string; multi: boolean }>) {
    projectStore.selectClip(e.detail.clipId, e.detail.multi);
    // テキスト/字幕クリップ選択時: 再生ヘッドがクリップ外なら先頭へシーク
    if (!e.detail.multi) {
      const clip = get(projectStore).timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === e.detail.clipId);
      if (clip && (clip.type === "text" || clip.type === "subtitle")) {
        const t = get(playheadTime);
        if (t < clip.timelineStart || t >= clip.timelineEnd) {
          playbackStore.pause();
          playbackStore.seek(clip.timelineStart);
        }
      }
    }
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
    if (track.type === "video" && asset.type !== "video" && asset.type !== "image") return;
    if (track.type === "audio" && asset.type !== "audio") return;
    if (track.type === "text" || track.type === "subtitle") return;

    const DEFAULT_IMAGE_DURATION = 5;
    const clipDuration = asset.duration > 0 ? asset.duration : DEFAULT_IMAGE_DURATION;
    projectStore.addClipToTrack(trackId, {
      id: crypto.randomUUID(),
      assetId: asset.id,
      type: asset.type as "video" | "audio" | "image",
      trackId,
      timelineStart: time,
      timelineEnd: time + clipDuration,
      sourceStart: 0,
      sourceEnd: clipDuration,
      name: asset.name,
      selected: false,
      audio: { volume: 1, muted: false, fadeIn: 0, fadeOut: 0 },
    });
  }

  function onTimelineClick(e: CustomEvent<{ time: number }>) {
    playbackStore.seek(e.detail.time);
    projectStore.clearSelection();
  }

  function trackIcon(type: string): string {
    return type === "video" ? "▶" : type === "audio" ? "♪" : type === "subtitle" ? "字" : "T";
  }
  function trackIconColor(type: string): string {
    return type === "video" ? "text-blue-400" : type === "audio" ? "text-green-400" : type === "subtitle" ? "text-orange-400" : "text-purple-400";
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

  <!-- タイムライン本体（単一スクロールコンテナ: 縦横両対応） -->
  <div
    bind:this={timelineEl}
    class="flex-1 overflow-auto"
  >
    <!-- ルーラー行: sticky top で縦スクロール時に固定 -->
    <div
      class="flex sticky top-0 z-20 bg-dark-800"
      style="min-width: {TRACK_LABEL_WIDTH + contentWidth}px;"
    >
      <!-- 左上コーナー: sticky left で横スクロール時にも固定 -->
      <div
        class="sticky left-0 z-30 flex-shrink-0 bg-dark-800 border-r border-b border-dark-600"
        style="width: {TRACK_LABEL_WIDTH}px; height: {RULER_HEIGHT}px;"
      ></div>
      <!-- ルーラー -->
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div
        on:click={onRulerClick}
        class="cursor-pointer border-b border-dark-600"
        style="width: {contentWidth}px;"
      >
        <TimelineRuler {duration} {zoom} />
      </div>
    </div>

    <!-- トラック行: ラベル列(sticky left) + コンテンツ列 -->
    <div
      class="relative flex"
      style="min-width: {TRACK_LABEL_WIDTH + contentWidth}px;"
    >
      <!-- ラベル列: sticky left で横スクロール時に固定 -->
      <div
        class="sticky left-0 z-10 flex-shrink-0 bg-dark-800 border-r border-dark-600"
        style="width: {TRACK_LABEL_WIDTH}px;"
      >
        {#each tracks as track}
          <div
            class="flex items-center gap-1 px-2 border-b border-dark-600"
            style="height: {TRACK_HEIGHT}px;"
          >
            <span class="text-xs font-bold flex-shrink-0 {trackIconColor(track.type)}">{trackIcon(track.type)}</span>
            <span class="text-xs text-gray-400 truncate">{track.name}</span>
          </div>
        {/each}
      </div>

      <!-- トラックコンテンツ + 再生ヘッド -->
      <div class="relative" style="width: {contentWidth}px;">
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
        <Playhead {zoom} height={tracks.length * TRACK_HEIGHT} />
      </div>
    </div>
  </div>
</div>
