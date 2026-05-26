<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Track, Clip } from "../../types/project";
  import TimelineClip from "./TimelineClip.svelte";
  import { pxToSeconds, secondsToPx } from "../../domain/time";

  export let track: Track;
  export let zoom: number;
  export let duration: number;

  const TRACK_HEIGHT = 48;

  const dispatch = createEventDispatcher<{
    "clip-select": { clipId: string; multi: boolean };
    "clip-move": { trackId: string; clipId: string; newStart: number };
    "clip-trim": { trackId: string; clipId: string; side: "left" | "right"; newPos: number };
    "drop-asset": { trackId: string; assetId: string; time: number };
    "timeline-click": { time: number };
  }>();

  let dragState: {
    type: "move" | "trim";
    clipId: string;
    startX: number;
    startPos: number;
    side?: "left" | "right";
    originalStart?: number;
  } | null = null;

  let previewX: number | null = null;

  function onClipMoveStart(e: CustomEvent<{ clipId: string; startX: number }>) {
    const clip = track.clips.find((c) => c.id === e.detail.clipId)!;
    dragState = {
      type: "move",
      clipId: e.detail.clipId,
      startX: e.detail.startX,
      startPos: clip.timelineStart,
      originalStart: clip.timelineStart,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onClipTrimStart(e: CustomEvent<{ clipId: string; side: "left" | "right"; startX: number; startPos: number }>) {
    dragState = {
      type: "trim",
      clipId: e.detail.clipId,
      startX: e.detail.startX,
      startPos: e.detail.startPos,
      side: e.detail.side,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dt = pxToSeconds(dx, zoom);

    if (dragState.type === "move") {
      previewX = secondsToPx(Math.max(0, dragState.startPos + dt), zoom);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dt = pxToSeconds(dx, zoom);

    if (dragState.type === "move") {
      const newStart = Math.max(0, dragState.startPos + dt);
      dispatch("clip-move", { trackId: track.id, clipId: dragState.clipId, newStart });
    } else if (dragState.type === "trim" && dragState.side) {
      const newPos = Math.max(0, dragState.startPos + dt);
      dispatch("clip-trim", { trackId: track.id, clipId: dragState.clipId, side: dragState.side, newPos });
    }

    dragState = null;
    previewX = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function onTrackClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    dispatch("timeline-click", { time: pxToSeconds(x, zoom) });
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const assetId = e.dataTransfer?.getData("assetId");
    if (!assetId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, pxToSeconds(x, zoom));
    dispatch("drop-asset", { trackId: track.id, assetId, time });
  }

  $: totalWidth = Math.max(secondsToPx(duration, zoom) + 200, 800);
</script>

<!-- svelte-ignore a11y-no-static-element-interactions a11y-click-events-have-key-events -->
<div
  class="relative bg-dark-700 border-b border-dark-600"
  style="height: {TRACK_HEIGHT}px; min-width: {totalWidth}px;"
  on:click={onTrackClick}
  on:dragover={onDragOver}
  on:drop={onDrop}
>
  {#each track.clips as clip (clip.id)}
    <TimelineClip
      {clip}
      {zoom}
      on:select={(e) => dispatch("clip-select", e.detail)}
      on:move-start={onClipMoveStart}
      on:trim-start={onClipTrimStart}
    />
  {/each}

  <!-- ドラッグプレビュー -->
  {#if previewX !== null}
    <div
      class="absolute top-1 bottom-1 w-1 bg-white/30 pointer-events-none"
      style="left: {previewX}px;"
    ></div>
  {/if}
</div>
