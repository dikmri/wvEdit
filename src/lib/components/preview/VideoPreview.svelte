<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { get } from "svelte/store";
  import { playbackStore, playheadTime } from "../../stores/playback-store";
  import { projectStore } from "../../stores/project-store";
  import { secondsToTimecode } from "../../domain/time";
  import type { Clip } from "../../types/project";

  let videoEl: HTMLVideoElement;
  let audioEl: HTMLAudioElement;
  let canvasEl: HTMLCanvasElement;
  let seekbarEl: HTMLInputElement;
  let timecodeEl: HTMLSpanElement;
  let rafId = 0;

  // RAF ループ内変数（Svelteリアクティビティなし）
  let activeUrl = "";
  let activeClip: Clip | null = null;
  let isSwitching = false;
  let storeTickCounter = 0;
  let cachedFps = 30;
  let cachedDuration = 0;

  // 音声クリップ
  let audioClip: Clip | null = null;
  let audioUrl = "";

  // 画像クリップ用クロック
  let clockPerfBase = 0;
  let clockTimeBase = 0;

  // 画像キャッシュ
  const imageCache = new Map<string, HTMLImageElement>();

  // テキストクリップD&D用
  let draggingTextClip: import("../../types/project").Clip | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function screenToCanvasPct(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }

  function onCanvasPointerDown(e: PointerEvent) {
    const t = get(playheadTime);
    // 現在時刻のクリップを優先、なければ選択中クリップを対象にする
    const textClip = findClipAt(t, sortedTextClips) ?? sortedTextClips.find((c) => c.selected) ?? null;
    if (!textClip?.text) return;
    const { x: px, y: py } = screenToCanvasPct(e.clientX, e.clientY);
    const clipX = textClip.text.x ?? 50;
    const clipY = textClip.text.y ?? 50;
    if (Math.abs(px - clipX) < 10 && Math.abs(py - clipY) < 10) {
      draggingTextClip = textClip;
      dragOffsetX = px - clipX;
      dragOffsetY = py - clipY;
      canvasEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      projectStore.selectClip(textClip.id, false);
    }
  }

  function onCanvasPointerMove(e: PointerEvent) {
    if (!draggingTextClip) return;
    const { x: px, y: py } = screenToCanvasPct(e.clientX, e.clientY);
    const newX = Math.max(0, Math.min(100, px - dragOffsetX));
    const newY = Math.max(0, Math.min(100, py - dragOffsetY));
    const proj = get(projectStore);
    const track = proj.timeline.tracks.find((t) => t.clips.some((c) => c.id === draggingTextClip!.id));
    if (track) {
      projectStore.updateClipText(track.id, draggingTextClip.id, { x: newX, y: newY });
    }
  }

  function onCanvasPointerUp(_e: PointerEvent) {
    draggingTextClip = null;
  }

  const unsubPb = playbackStore.subscribe((s) => {
    cachedFps = s.fps;
    cachedDuration = s.duration;
  });

  let sortedClips: Clip[] = [];
  $: sortedClips = $projectStore.timeline.tracks
    .filter((t) => t.type === "video")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  let sortedAudioClips: Clip[] = [];
  $: sortedAudioClips = $projectStore.timeline.tracks
    .filter((t) => t.type === "audio")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  let sortedTextClips: Clip[] = [];
  $: sortedTextClips = $projectStore.timeline.tracks
    .filter((t) => t.type === "text")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  let sortedSubtitleClips: Clip[] = [];
  $: sortedSubtitleClips = $projectStore.timeline.tracks
    .filter((t) => t.type === "subtitle")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.timelineStart - b.timelineStart);

  // テキスト/字幕/ドラッグ状態変更時に再描画（一時停止中）
  $: if (sortedTextClips) redrawCanvas();
  $: if (sortedSubtitleClips) redrawCanvas();
  $: if (draggingTextClip !== undefined) redrawCanvas();

  function findClipAt(time: number, clips: Clip[]): Clip | null {
    for (const clip of clips) {
      if (clip.timelineStart > time) break;
      if (time < clip.timelineEnd) return clip;
    }
    return null;
  }

  function getAssetUrl(clip: Clip): string {
    return get(projectStore).assets.find((a) => a.id === clip.assetId)?.objectUrl ?? "";
  }

  function loadImageAsset(assetId: string, url: string): Promise<HTMLImageElement> {
    if (imageCache.has(assetId)) return Promise.resolve(imageCache.get(assetId)!);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { imageCache.set(assetId, img); resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  function switchClip(clip: Clip) {
    activeClip = clip;
    if (clip.type === "image") {
      const url = getAssetUrl(clip);
      activeUrl = url;
      isSwitching = false;
      loadImageAsset(clip.assetId, url).then(() => {
        if (activeClip?.id === clip.id) redrawCanvas();
      }).catch(() => {});
      return;
    }
    const url = getAssetUrl(clip);
    if (url !== activeUrl) {
      activeUrl = url;
      isSwitching = true;
      if (videoEl) videoEl.src = url;
    }
  }

  function getFadeVolume(clip: Clip, timelineTime: number): number {
    const base = clip.audio?.volume ?? 1;
    const elapsed = timelineTime - clip.timelineStart;
    const total = clip.timelineEnd - clip.timelineStart;
    const fadeIn = clip.audio?.fadeIn ?? 0;
    const fadeOut = clip.audio?.fadeOut ?? 0;
    let vol = base;
    if (fadeIn > 0 && elapsed < fadeIn) vol *= Math.max(0, elapsed / fadeIn);
    if (fadeOut > 0 && elapsed > total - fadeOut) vol *= Math.max(0, (total - elapsed) / fadeOut);
    return Math.max(0, Math.min(1, vol));
  }

  function syncAudio(timelineTime: number) {
    const newClip = findClipAt(timelineTime, sortedAudioClips);
    if (newClip?.id !== audioClip?.id) {
      if (!newClip) {
        audioEl?.pause();
        audioClip = null;
        audioUrl = "";
        return;
      }
      const url = getAssetUrl(newClip);
      audioClip = newClip;
      if (audioEl) {
        if (url !== audioUrl) {
          audioUrl = url;
          audioEl.src = url;
        }
        const srcTime = newClip.sourceStart + (timelineTime - newClip.timelineStart);
        audioEl.currentTime = Math.max(0, srcTime);
        audioEl.volume = getFadeVolume(newClip, timelineTime);
        if (get(playbackStore).isPlaying) audioEl.play().catch(() => {});
      }
    } else if (audioClip && audioEl) {
      audioEl.volume = getFadeVolume(audioClip, timelineTime);
    }
  }

  function applySeek(timelineTime: number, clip: Clip) {
    if (!videoEl || clip.type === "image") return;
    const sourceTime = clip.sourceStart + (timelineTime - clip.timelineStart);
    if (Math.abs(videoEl.currentTime - sourceTime) > 0.05) {
      videoEl.currentTime = sourceTime;
    }
  }

  function redrawCanvas() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const W = canvasEl.width;
    const H = canvasEl.height;
    ctx.clearRect(0, 0, W, H);

    // 画像クリップ
    if (activeClip?.type === "image") {
      const img = imageCache.get(activeClip.assetId);
      if (img) ctx.drawImage(img, 0, 0, W, H);
    }

    const t = get(playheadTime);

    // テキストクリップ（自由配置: x/y%, rotation deg）
    const textClip = findClipAt(t, sortedTextClips);

    // 選択中テキストクリップのドラッグハンドルを時間外でも描画
    for (const tc of sortedTextClips) {
      if (!tc.selected || !tc.text) continue;
      const ts = tc.text;
      const cx = W * ((ts.x ?? 50) / 100);
      const cy = H * ((ts.y ?? 50) / 100);
      ctx.save();
      ctx.strokeStyle = draggingTextClip?.id === tc.id ? "rgba(96,165,250,1)" : "rgba(96,165,250,0.7)";
      ctx.lineWidth = Math.max(1, H / 540);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, H * 0.022, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (textClip?.text) {
      const ts = textClip.text;
      const scaledSize = Math.max(12, Math.round(ts.fontSize * (H / 1080)));
      ctx.font = `${ts.italic ? "italic" : "normal"} ${ts.bold ? "bold" : "normal"} ${scaledSize}px ${ts.fontFamily}`;
      ctx.textAlign = ts.align as CanvasTextAlign;
      ctx.textBaseline = "middle";

      const cx = W * ((ts.x ?? 50) / 100);
      const cy = H * ((ts.y ?? 50) / 100);
      const rad = ((ts.rotation ?? 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);

      if (ts.backgroundColor) {
        const metrics = ctx.measureText(ts.text);
        const tw = metrics.width;
        const th = scaledSize * 1.4;
        const bx = ts.align === "center" ? -tw / 2 - 10 : ts.align === "right" ? -tw - 10 : -10;
        ctx.fillStyle = ts.backgroundColor;
        ctx.fillRect(bx, -th / 2, tw + 20, th);
      }
      ctx.fillStyle = ts.color;
      ctx.fillText(ts.text, 0, 0);
      ctx.restore();
    }

    // 字幕クリップ（横中央固定, y% 縦位置, 背景あり）
    const subtitleClip = findClipAt(t, sortedSubtitleClips);
    if (subtitleClip?.text) {
      const ts = subtitleClip.text;
      const scaledSize = Math.max(12, Math.round(ts.fontSize * (H / 1080)));
      ctx.font = `${ts.italic ? "italic" : "normal"} ${ts.bold ? "bold" : "normal"} ${scaledSize}px ${ts.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textX = W / 2;
      const textY = H * ((ts.y ?? 82) / 100);

      if (ts.backgroundColor) {
        const metrics = ctx.measureText(ts.text);
        const tw = metrics.width;
        const th = scaledSize * 1.4;
        ctx.fillStyle = ts.backgroundColor;
        ctx.fillRect(textX - tw / 2 - 10, textY - th / 2, tw + 20, th);
      }
      ctx.fillStyle = ts.color;
      ctx.fillText(ts.text, textX, textY);
    }
  }

  function updateUI(time: number) {
    if (seekbarEl) seekbarEl.value = String(time);
    if (timecodeEl) timecodeEl.textContent = secondsToTimecode(time, cachedFps);
    redrawCanvas();
  }

  // ========== RAF ループ（再生中のみ動作） ==========
  function tick() {
    if (!activeClip || isSwitching) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    let timelineTime: number;

    if (activeClip.type === "image") {
      timelineTime = clockTimeBase + (performance.now() - clockPerfBase) / 1000;
    } else {
      if (!videoEl) { rafId = requestAnimationFrame(tick); return; }
      const vt = videoEl.currentTime;
      timelineTime = activeClip.timelineStart + (vt - activeClip.sourceStart);
    }

    // クリップ終端チェック
    const reachedEnd = activeClip.type === "image"
      ? timelineTime >= activeClip.timelineEnd - 0.04
      : videoEl.currentTime >= activeClip.sourceEnd - 0.04;

    if (reachedEnd || timelineTime >= cachedDuration - 0.04) {
      const nextClip = sortedClips.find(
        (c) => c.id !== activeClip!.id && c.timelineStart >= activeClip!.timelineEnd - 0.01
      );
      if (nextClip) {
        if (activeClip.type !== "image") videoEl.pause();
        switchClip(nextClip);
        if (nextClip.type === "image") {
          clockPerfBase = performance.now();
          clockTimeBase = nextClip.timelineStart;
        } else {
          videoEl.currentTime = nextClip.sourceStart;
          videoEl.play().catch(() => {});
        }
      } else {
        if (activeClip.type !== "image") videoEl.pause();
        audioEl?.pause();
        audioClip = null;
        playbackStore.pause();
        playbackStore.seek(0);
        playheadTime.set(0);
        updateUI(0);
        rafId = 0;
        return;
      }
    }

    // ビデオ音量フェード（毎フレーム更新）
    if (activeClip.type !== "image" && videoEl) {
      videoEl.volume = getFadeVolume(activeClip, timelineTime);
    }

    syncAudio(timelineTime);
    playheadTime.set(timelineTime);
    updateUI(timelineTime);

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
        const clip = findClipAt(t, sortedClips);
        if (clip) {
          if (clip.type === "image") {
            switchClip(clip);
            clockPerfBase = performance.now();
            clockTimeBase = t;
          } else {
            const url = getAssetUrl(clip);
            if (url !== activeUrl) {
              switchClip(clip); // loadedmetadata で play()
            } else {
              activeClip = clip;
              applySeek(t, clip);
              videoEl?.play().catch(() => {});
            }
          }
          syncAudio(t);
          storeTickCounter = 0;
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(tick);
        }
      } else if (!state.isPlaying && prevIsPlaying) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        videoEl?.pause();
        audioEl?.pause();
        if (videoEl && activeClip && activeClip.type !== "image") {
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
    const clip = findClipAt(t, sortedClips) ?? activeClip;
    if (!clip || !videoEl || clip.type === "image") return;
    activeClip = clip;
    applySeek(t, clip);
    if (get(playbackStore).isPlaying) videoEl.play().catch(() => {});
  }

  // 一時停止中: playbackStore の currentTime 変化に追従してビデオをシーク
  $: if (!$playbackStore.isPlaying && videoEl !== undefined) {
    const t = $playbackStore.currentTime;
    const clip = findClipAt(t, sortedClips);
    if (clip) {
      if (clip.type === "image") {
        if (activeClip?.id !== clip.id) switchClip(clip);
        else redrawCanvas();
      } else {
        const url = getAssetUrl(clip);
        if (url !== activeUrl) {
          switchClip(clip); // handleLoadedMetadata でシーク
        } else {
          activeClip = clip;
          applySeek(t, clip);
        }
      }
    } else {
      activeClip = null;
      activeUrl = "";
    }
    playheadTime.set(t);
    updateUI(t);
  }

  $: playbackStore.setDuration($projectStore.timeline.duration);
  $: playbackStore.setFps($projectStore.settings.fps);

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    videoEl?.pause();
    audioEl?.pause();
    unsubPb();
  });
</script>

<div class="flex flex-col h-full bg-dark-900">
  <!-- 動画表示エリア -->
  <div class="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
      bind:this={videoEl}
      class="max-w-full max-h-full object-contain"
      class:hidden={!activeUrl || activeClip?.type === "image"}
      preload="auto"
      on:loadedmetadata={handleLoadedMetadata}
    ></video>

    <!-- Canvas: 画像クリップ描画 + テキストオーバーレイ (テキストD&D対応) -->
    <canvas
      bind:this={canvasEl}
      width={$projectStore.settings.width}
      height={$projectStore.settings.height}
      class="absolute max-w-full max-h-full object-contain"
      style="cursor: {draggingTextClip ? 'grabbing' : 'default'};"
      on:pointerdown={onCanvasPointerDown}
      on:pointermove={onCanvasPointerMove}
      on:pointerup={onCanvasPointerUp}
      on:pointerleave={onCanvasPointerUp}
    ></canvas>

    <!-- svelte-ignore a11y-media-has-caption -->
    <audio bind:this={audioEl} preload="auto"></audio>

    {#if !activeUrl && sortedClips.length === 0}
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
