<script lang="ts">
  import { onDestroy } from "svelte";
  import { playbackStore } from "../../stores/playback-store";
  import { projectStore } from "../../stores/project-store";
  import { secondsToTimecode } from "../../domain/time";

  let videoEl: HTMLVideoElement;
  let rafId: number;
  let currentAssetUrl = "";

  // 現在時刻に対応するクリップを探す
  $: currentClip = (() => {
    const t = $playbackStore.currentTime;
    for (const track of $projectStore.timeline.tracks) {
      if (track.type !== "video") continue;
      for (const clip of track.clips) {
        if (t >= clip.timelineStart && t < clip.timelineEnd) return clip;
      }
    }
    return null;
  })();

  $: currentAsset = currentClip
    ? $projectStore.assets.find((a) => a.id === currentClip!.assetId)
    : null;

  // 素材が変わったらvideoのsrcを更新
  $: if (videoEl && currentAsset?.objectUrl && currentAsset.objectUrl !== currentAssetUrl) {
    currentAssetUrl = currentAsset.objectUrl;
    videoEl.src = currentAssetUrl;
    syncVideoTime($playbackStore.currentTime);
  }

  // 再生ヘッドに合わせてvideoを同期
  $: if (videoEl && currentClip && !$playbackStore.isPlaying) {
    syncVideoTime($playbackStore.currentTime);
  }

  function syncVideoTime(time: number) {
    if (!videoEl || !currentClip) return;
    const sourceTime = currentClip.sourceStart + (time - currentClip.timelineStart);
    if (Math.abs(videoEl.currentTime - sourceTime) > 0.05) {
      videoEl.currentTime = sourceTime;
    }
  }

  // 再生ループ
  function startPlayback() {
    let lastTs: number | null = null;
    function tick(ts: number) {
      if (!$playbackStore.isPlaying) return;
      if (lastTs !== null) {
        const delta = (ts - lastTs) / 1000;
        const next = $playbackStore.currentTime + delta;
        if (next >= $playbackStore.duration) {
          playbackStore.pause();
          playbackStore.seek(0);
          return;
        }
        playbackStore.setCurrentTime(next);
        syncVideoTime(next);
      }
      lastTs = ts;
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  $: if ($playbackStore.isPlaying) {
    startPlayback();
  } else {
    cancelAnimationFrame(rafId);
  }

  // タイムライン総尺をplaybackStoreへ反映
  $: playbackStore.setDuration($projectStore.timeline.duration);
  $: playbackStore.setFps($projectStore.settings.fps);

  $: timecode = secondsToTimecode($playbackStore.currentTime, $playbackStore.fps);

  onDestroy(() => cancelAnimationFrame(rafId));
</script>

<div class="flex flex-col h-full bg-dark-900">
  <!-- 動画表示エリア -->
  <div class="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
    {#if currentAsset?.objectUrl}
      <!-- svelte-ignore a11y-media-has-caption -->
      <video
        bind:this={videoEl}
        class="max-w-full max-h-full object-contain"
        preload="auto"
        on:loadedmetadata={() => syncVideoTime($playbackStore.currentTime)}
      ></video>
    {:else}
      <div class="text-gray-600 text-center">
        <div class="text-4xl mb-2">🎬</div>
        <p class="text-xs">素材を読み込んでタイムラインに配置してください</p>
      </div>
    {/if}
  </div>

  <!-- コントロール -->
  <div class="flex flex-col gap-1 px-3 py-2 bg-dark-800 border-t border-dark-600">
    <!-- シークバー -->
    <input
      type="range"
      min="0"
      max={$playbackStore.duration || 1}
      step={1 / $playbackStore.fps}
      value={$playbackStore.currentTime}
      class="w-full h-1 accent-accent-blue"
      on:input={(e) => {
        playbackStore.pause();
        playbackStore.seek(Number((e.target as HTMLInputElement).value));
      }}
    />

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <button class="btn-ghost text-xs" on:click={() => playbackStore.stepBackward()} title="前フレーム">◀◀</button>
        <button
          class="btn-ghost text-sm w-8 h-8 flex items-center justify-center"
          on:click={() => playbackStore.togglePlay()}
          title="スペースキー"
        >
          {$playbackStore.isPlaying ? "⏸" : "▶"}
        </button>
        <button class="btn-ghost text-xs" on:click={() => playbackStore.stepForward()} title="次フレーム">▶▶</button>
      </div>

      <span class="text-xs font-mono text-gray-400">{timecode}</span>
    </div>
  </div>
</div>
