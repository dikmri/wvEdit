<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import { playbackStore } from "../../stores/playback-store";
  import { projectStore } from "../../stores/project-store";
  import { secondsToTimecode } from "../../domain/time";
  import type { Clip } from "../../types/project";

  let videoEl: HTMLVideoElement;
  let rafId = 0;
  let activeAssetUrl = "";

  // 指定時刻のクリップをプロジェクトから直接検索（ストア非依存）
  function findClipAt(time: number): Clip | null {
    const project = get(projectStore);
    for (const track of project.timeline.tracks) {
      if (track.type !== "video") continue;
      for (const clip of track.clips) {
        if (time >= clip.timelineStart && time < clip.timelineEnd) return clip;
      }
    }
    return null;
  }

  // 現在時刻に対応するクリップ（UI表示用リアクティブ）
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

  // 一時停止中: 素材切り替えとシーク
  $: if (!$playbackStore.isPlaying && videoEl) {
    const url = currentAsset?.objectUrl ?? null;
    if (url && url !== activeAssetUrl) {
      activeAssetUrl = url;
      videoEl.src = url;
      // シークは loadedmetadata イベントで行う
    } else if (currentClip && url) {
      applySeek($playbackStore.currentTime, currentClip);
    }
  }

  function applySeek(time: number, clip: Clip) {
    if (!videoEl) return;
    const sourceTime = clip.sourceStart + (time - clip.timelineStart);
    if (Math.abs(videoEl.currentTime - sourceTime) > 0.05) {
      videoEl.currentTime = sourceTime;
    }
  }

  function handleLoadedMetadata() {
    const state = get(playbackStore);
    const clip = findClipAt(state.currentTime);
    if (clip) applySeek(state.currentTime, clip);
  }

  // 再生ループ: ストア購読で開始/停止を管理し、RAF内ではget()で値を取得
  function startPlayback() {
    cancelAnimationFrame(rafId);
    let lastTs: number | null = null;

    function tick(ts: number) {
      const state = get(playbackStore);
      if (!state.isPlaying) {
        rafId = 0;
        return;
      }

      if (lastTs !== null) {
        const delta = (ts - lastTs) / 1000;
        const next = state.currentTime + delta;

        if (next >= state.duration) {
          playbackStore.pause();
          playbackStore.seek(0);
          rafId = 0;
          return;
        }

        // この時点でのクリップをget()で直接検索（リアクティブ変数に依存しない）
        const clip = findClipAt(next);
        if (clip && videoEl) {
          const project = get(projectStore);
          const asset = project.assets.find((a) => a.id === clip.assetId);
          if (asset?.objectUrl && asset.objectUrl !== activeAssetUrl) {
            // クリップ間の素材切り替え
            activeAssetUrl = asset.objectUrl;
            videoEl.src = activeAssetUrl;
            // loadedmetadata で正しい位置にシークされる
          } else {
            applySeek(next, clip);
          }
        }

        playbackStore.setCurrentTime(next);
      }

      lastTs = ts;
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
  }

  // isPlaying の false→true 遷移のみ startPlayback を呼ぶ
  onMount(() => {
    let prevIsPlaying = false;
    const unsubscribe = playbackStore.subscribe((state) => {
      if (state.isPlaying && !prevIsPlaying) {
        startPlayback();
      } else if (!state.isPlaying && prevIsPlaying) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      prevIsPlaying = state.isPlaying;
    });
    return unsubscribe;
  });

  onDestroy(() => cancelAnimationFrame(rafId));

  // タイムライン総尺をplaybackStoreへ反映
  $: playbackStore.setDuration($projectStore.timeline.duration);
  $: playbackStore.setFps($projectStore.settings.fps);

  $: timecode = secondsToTimecode($playbackStore.currentTime, $playbackStore.fps);
</script>

<div class="flex flex-col h-full bg-dark-900">
  <!-- 動画表示エリア -->
  <div class="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
    <!-- videoは常にマウントし、素材がない場合は非表示にする -->
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
      bind:this={videoEl}
      class="max-w-full max-h-full object-contain"
      class:hidden={!currentAsset?.objectUrl}
      preload="auto"
      on:loadedmetadata={handleLoadedMetadata}
    ></video>

    {#if !currentAsset?.objectUrl}
      <div class="text-gray-600 text-center absolute">
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
