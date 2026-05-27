<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import { playbackStore, playheadTime } from "../../stores/playback-store";
  import { projectStore } from "../../stores/project-store";
  import { secondsToTimecode } from "../../domain/time";
  import type { Clip } from "../../types/project";

  let videoEl: HTMLVideoElement;
  let seekbarEl: HTMLInputElement;
  let timecodeEl: HTMLSpanElement;
  let rafId = 0;

  // RAF ループ内で使うモジュールスコープ変数（Svelte リアクティビティなし）
  let activeUrl = "";
  let activeClip: Clip | null = null;
  let isSwitching = false; // src 切り替え中フラグ
  let storeTickCounter = 0; // playbackStore.setCurrentTime の間引きカウンタ
  let cachedFps = 30;
  let cachedDuration = 0;

  // playbackStore の fps/duration をキャッシュ（RAF 内で get() しない）
  const unsubPb = playbackStore.subscribe((s) => {
    cachedFps = s.fps;
    cachedDuration = s.duration;
  });

  // クリップリスト（ソート済み）をリアクティブにキャッシュ
  let sortedClips: Clip[] = [];
  $: sortedClips = $projectStore.timeline.tracks
    .filter((t) => t.type === "video")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  function findClipAt(time: number): Clip | null {
    for (const clip of sortedClips) {
      if (clip.timelineStart > time) break;
      if (time < clip.timelineEnd) return clip;
    }
    return null;
  }

  function getAssetUrl(clip: Clip): string {
    return get(projectStore).assets.find((a) => a.id === clip.assetId)?.objectUrl ?? "";
  }

  // video.src を必要な場合のみ変更する
  function switchClip(clip: Clip) {
    const url = getAssetUrl(clip);
    activeClip = clip;
    if (url !== activeUrl) {
      activeUrl = url;
      isSwitching = true;
      videoEl.src = url;
    }
  }

  function applySeek(timelineTime: number, clip: Clip) {
    if (!videoEl) return;
    const sourceTime = clip.sourceStart + (timelineTime - clip.timelineStart);
    if (Math.abs(videoEl.currentTime - sourceTime) > 0.05) {
      videoEl.currentTime = sourceTime;
    }
  }

  // DOM を直接更新してリアクティビティを回避
  function updateUI(time: number) {
    if (seekbarEl) seekbarEl.value = String(time);
    if (timecodeEl) timecodeEl.textContent = secondsToTimecode(time, cachedFps);
  }

  // ========== RAF ループ（再生中のみ動作） ==========
  function tick() {
    // src 切り替え中は video.currentTime が不定なのでスキップ
    if (!videoEl || !activeClip || isSwitching) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const vt = videoEl.currentTime;
    const timelineTime = activeClip.timelineStart + (vt - activeClip.sourceStart);

    // クリップ終端 / タイムライン終端チェック
    if (vt >= activeClip.sourceEnd - 0.04 || timelineTime >= cachedDuration - 0.04) {
      const nextClip = sortedClips.find(
        (c) => c.id !== activeClip!.id && c.timelineStart >= activeClip!.timelineEnd - 0.01
      );
      if (nextClip) {
        // 次のクリップへシームレス切り替え
        switchClip(nextClip);
        videoEl.currentTime = nextClip.sourceStart;
        videoEl.play();
      } else {
        // 終端: 停止してリセット
        videoEl.pause();
        playbackStore.pause();
        playbackStore.seek(0);
        playheadTime.set(0);
        updateUI(0);
        rafId = 0;
        return;
      }
    }

    // 60fps: playheadTime のみ更新（Playhead コンポーネントだけが再描画）
    playheadTime.set(timelineTime);
    updateUI(timelineTime);

    // ~10fps: playbackStore.currentTime を間引いて更新
    if (++storeTickCounter >= 6) {
      storeTickCounter = 0;
      playbackStore.setCurrentTime(timelineTime);
    }

    rafId = requestAnimationFrame(tick);
  }

  // ========== 再生 / 停止の制御 ==========
  onMount(() => {
    let prevIsPlaying = false;
    const unsubscribe = playbackStore.subscribe((state) => {
      if (state.isPlaying && !prevIsPlaying) {
        const t = state.currentTime;
        const clip = findClipAt(t);
        if (clip && videoEl) {
          const url = getAssetUrl(clip);
          if (url !== activeUrl) {
            switchClip(clip); // loadedmetadata で play()
          } else {
            activeClip = clip;
            applySeek(t, clip);
            videoEl.play();
          }
          storeTickCounter = 0;
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(tick);
        }
      } else if (!state.isPlaying && prevIsPlaying) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        videoEl?.pause();
        // 停止時: 正確な現在位置をストアへ書き込む
        if (videoEl && activeClip) {
          const finalTime = activeClip.timelineStart + (videoEl.currentTime - activeClip.sourceStart);
          playbackStore.setCurrentTime(finalTime);
          playheadTime.set(finalTime);
          updateUI(finalTime);
        }
      }
      prevIsPlaying = state.isPlaying;
    });
    return unsubscribe;
  });

  // loadedmetadata: src 変更完了後にシーク & 再生
  function handleLoadedMetadata() {
    isSwitching = false;
    const t = get(playbackStore).currentTime;
    const clip = findClipAt(t) ?? activeClip;
    if (!clip || !videoEl) return;
    activeClip = clip;
    applySeek(t, clip);
    if (get(playbackStore).isPlaying) {
      videoEl.play();
    }
  }

  // 一時停止中: playbackStore の currentTime 変化に追従してビデオをシーク
  $: if (!$playbackStore.isPlaying && videoEl) {
    const t = $playbackStore.currentTime;
    const clip = findClipAt(t);
    if (clip) {
      const url = getAssetUrl(clip);
      if (url !== activeUrl) {
        switchClip(clip); // handleLoadedMetadata でシーク
      } else {
        activeClip = clip;
        applySeek(t, clip);
      }
    }
    playheadTime.set(t);
    updateUI(t);
  }

  // タイムライン総尺 / fps をストアへ反映
  $: playbackStore.setDuration($projectStore.timeline.duration);
  $: playbackStore.setFps($projectStore.settings.fps);

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    videoEl?.pause();
    unsubPb();
  });
</script>

<div class="flex flex-col h-full bg-dark-900">
  <!-- 動画表示エリア -->
  <div class="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
      bind:this={videoEl}
      class="max-w-full max-h-full object-contain"
      class:hidden={!activeUrl}
      preload="auto"
      on:loadedmetadata={handleLoadedMetadata}
    ></video>

    {#if !activeUrl}
      <div class="text-gray-600 text-center absolute">
        <div class="text-4xl mb-2">🎬</div>
        <p class="text-xs">素材を読み込んでタイムラインに配置してください</p>
      </div>
    {/if}
  </div>

  <!-- コントロール -->
  <div class="flex flex-col gap-1 px-3 py-2 bg-dark-800 border-t border-dark-600">
    <!-- シークバー: 直接 DOM 更新。RAF が value を書くため reactive binding なし -->
    <input
      bind:this={seekbarEl}
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

      <!-- タイムコード: RAF が直接 textContent を書く -->
      <span bind:this={timecodeEl} class="text-xs font-mono text-gray-400">
        {secondsToTimecode($playbackStore.currentTime, $playbackStore.fps)}
      </span>
    </div>
  </div>
</div>
