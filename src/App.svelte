<script lang="ts">
  import { onMount } from "svelte";
  import TopBar from "./lib/components/layout/TopBar.svelte";
  import MediaPanel from "./lib/components/media/MediaPanel.svelte";
  import VideoPreview from "./lib/components/preview/VideoPreview.svelte";
  import InspectorPanel from "./lib/components/inspector/InspectorPanel.svelte";
  import Timeline from "./lib/components/timeline/Timeline.svelte";
  import ExportDialog from "./lib/components/layout/ExportDialog.svelte";
  import ErrorBanner from "./lib/components/common/ErrorBanner.svelte";
  import { get } from "svelte/store";
  import { projectStore } from "./lib/stores/project-store";
  import { playbackStore, playheadTime } from "./lib/stores/playback-store";
  import { uiStore } from "./lib/stores/ui-store";
  import { createNewProject } from "./lib/domain/project";
  import { loadMediaFile } from "./lib/media/file-loader";
  import { downloadProjectFile } from "./lib/persistence/project-json";
  import type { MediaAsset } from "./lib/types/project";

  let exportDialogOpen = false;
  let mediaFileInput: HTMLInputElement;

  function handleNewProject() {
    projectStore.loadProject(createNewProject());
    playbackStore.seek(0);
    playbackStore.pause();
  }

  function handleImportMedia() {
    mediaFileInput.click();
  }

  async function onMediaFilesSelected(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files?.length) return;
    uiStore.setLoading("loading");
    for (const file of Array.from(files)) {
      try {
        const asset = await loadMediaFile(file);
        projectStore.addAsset(asset);
      } catch (err) {
        uiStore.setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      }
    }
    uiStore.setLoading("idle");
    (e.target as HTMLInputElement).value = "";
  }

  const DEFAULT_IMAGE_DURATION = 5;

  function addAssetToTimeline(asset: MediaAsset) {
    if (asset.type === "video" || asset.type === "image") {
      const videoTrack = get(projectStore).timeline.tracks.find((t) => t.type === "video");
      if (!videoTrack) return;
      const maxEnd = videoTrack.clips.reduce((m, c) => Math.max(m, c.timelineEnd), 0);
      const duration = asset.duration > 0 ? asset.duration : DEFAULT_IMAGE_DURATION;
      projectStore.addClipToTrack(videoTrack.id, {
        id: crypto.randomUUID(),
        assetId: asset.id,
        type: asset.type,
        trackId: videoTrack.id,
        timelineStart: maxEnd,
        timelineEnd: maxEnd + duration,
        sourceStart: 0,
        sourceEnd: duration,
        name: asset.name,
        selected: false,
        audio: { volume: 1, muted: false, fadeIn: 0, fadeOut: 0 },
      });
    } else if (asset.type === "audio") {
      const audioTrack = get(projectStore).timeline.tracks.find((t) => t.type === "audio");
      if (!audioTrack) return;
      const maxEnd = audioTrack.clips.reduce((m, c) => Math.max(m, c.timelineEnd), 0);
      projectStore.addClipToTrack(audioTrack.id, {
        id: crypto.randomUUID(),
        assetId: asset.id,
        type: "audio",
        trackId: audioTrack.id,
        timelineStart: maxEnd,
        timelineEnd: maxEnd + asset.duration,
        sourceStart: 0,
        sourceEnd: asset.duration,
        name: asset.name,
        selected: false,
        audio: { volume: 1, muted: false, fadeIn: 0, fadeOut: 0 },
      });
    }
  }

  function addTextClip() {
    const textTrack = get(projectStore).timeline.tracks.find((t) => t.type === "text");
    if (!textTrack) return;
    const t = get(playheadTime);
    const duration = 5;
    projectStore.addClipToTrack(textTrack.id, {
      id: crypto.randomUUID(),
      assetId: "",
      type: "text",
      trackId: textTrack.id,
      timelineStart: t,
      timelineEnd: t + duration,
      sourceStart: 0,
      sourceEnd: duration,
      name: "テキスト",
      selected: false,
      text: {
        text: "テキストを入力",
        fontSize: 72,
        fontFamily: "sans-serif",
        color: "#ffffff",
        bold: false,
        italic: false,
        align: "center",
      },
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        playbackStore.togglePlay();
        break;
      case "s":
      case "S":
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          downloadProjectFile(get(projectStore));
        } else {
          splitAtPlayhead();
        }
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        projectStore.deleteSelectedClips();
        break;
      case "z":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          projectStore.undo();
        }
        break;
      case "y":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          projectStore.redo();
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (e.shiftKey) playbackStore.seek(get(playheadTime) - 1);
        else playbackStore.stepBackward();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (e.shiftKey) playbackStore.seek(get(playheadTime) + 1);
        else playbackStore.stepForward();
        break;
    }
  }

  function splitAtPlayhead() {
    const t = get(playheadTime);
    const fps = get(projectStore).settings.fps;
    for (const track of get(projectStore).timeline.tracks) {
      const clip = track.clips.find((c) => t > c.timelineStart && t < c.timelineEnd);
      if (clip) {
        projectStore.splitClipAtTime(clip.id, t, fps);
        break;
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="flex flex-col h-screen overflow-hidden bg-dark-900">
  <TopBar
    on:new-project={handleNewProject}
    on:import-media={handleImportMedia}
    on:export={() => (exportDialogOpen = true)}
  />

  <!-- メインエリア -->
  <div class="flex flex-1 overflow-hidden" style="min-height: 0;">
    <!-- 左: 素材パネル -->
    <div class="w-48 flex-shrink-0 overflow-hidden">
      <MediaPanel on:add-to-timeline={(e) => addAssetToTimeline(e.detail)} on:add-text={addTextClip} />
    </div>

    <!-- 中央: プレビュー -->
    <div class="flex-1 overflow-hidden">
      <VideoPreview />
    </div>

    <!-- 右: インスペクター -->
    <div class="w-52 flex-shrink-0 overflow-hidden">
      <InspectorPanel />
    </div>
  </div>

  <!-- 下: タイムライン -->
  <div class="h-48 flex-shrink-0 border-t border-dark-600">
    <Timeline />
  </div>
</div>

<!-- ダイアログ -->
<ExportDialog bind:open={exportDialogOpen} on:close={() => (exportDialogOpen = false)} />
<ErrorBanner />

<!-- 非表示のファイル入力 -->
<input
  bind:this={mediaFileInput}
  type="file"
  accept="video/*,audio/*,image/*"
  multiple
  class="hidden"
  on:change={onMediaFilesSelected}
/>
