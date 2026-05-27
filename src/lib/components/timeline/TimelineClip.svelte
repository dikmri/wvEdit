<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Clip } from "../../types/project";
  import { secondsToPx, pxToSeconds } from "../../domain/time";

  export let clip: Clip;
  export let zoom: number;

  const dispatch = createEventDispatcher<{
    select: { clipId: string; multi: boolean };
    "move-start": { clipId: string; startX: number };
    "trim-start": { clipId: string; side: "left" | "right"; startX: number; startPos: number };
  }>();

  $: left = secondsToPx(clip.timelineStart, zoom);
  $: width = Math.max(secondsToPx(clip.timelineEnd - clip.timelineStart, zoom), 4);

  const TRIM_HANDLE_WIDTH = 8;

  function onPointerDown(e: PointerEvent) {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    if (target.dataset.trim) {
      dispatch("trim-start", {
        clipId: clip.id,
        side: target.dataset.trim as "left" | "right",
        startX: e.clientX,
        startPos: target.dataset.trim === "left" ? clip.timelineStart : clip.timelineEnd,
      });
      return;
    }

    dispatch("select", { clipId: clip.id, multi: e.ctrlKey || e.metaKey });
    dispatch("move-start", { clipId: clip.id, startX: e.clientX });
  }

  $: clipColor = clip.type === "video"
    ? "bg-blue-800 border-blue-600"
    : clip.type === "audio"
    ? "bg-green-900 border-green-700"
    : clip.type === "image"
    ? "bg-teal-900 border-teal-700"
    : "bg-purple-900 border-purple-700";

  $: selectedStyle = clip.selected ? "ring-2 ring-accent-blue" : "";
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div
  class="absolute top-0 h-full {clipColor} border rounded cursor-pointer select-none overflow-hidden {selectedStyle}"
  style="left: {left}px; width: {width}px;"
  on:pointerdown={onPointerDown}
  on:click|stopPropagation
>
  <!-- 左トリムハンドル -->
  <div
    class="absolute left-0 top-0 h-full flex items-center justify-center cursor-ew-resize hover:bg-white/20 z-10"
    style="width: {TRIM_HANDLE_WIDTH}px;"
    data-trim="left"
  >
    <div class="w-0.5 h-4 bg-white/50 pointer-events-none"></div>
  </div>

  <!-- クリップ名 -->
  <div class="absolute inset-0 flex items-center px-3 pointer-events-none">
    <span class="text-xs text-white/80 truncate" style="padding-left: {TRIM_HANDLE_WIDTH - 2}px;">
      {clip.name}
    </span>
  </div>

  <!-- 右トリムハンドル -->
  <div
    class="absolute right-0 top-0 h-full flex items-center justify-center cursor-ew-resize hover:bg-white/20 z-10"
    style="width: {TRIM_HANDLE_WIDTH}px;"
    data-trim="right"
  >
    <div class="w-0.5 h-4 bg-white/50 pointer-events-none"></div>
  </div>
</div>
