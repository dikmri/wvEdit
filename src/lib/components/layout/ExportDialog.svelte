<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "../common/Modal.svelte";
  import ProgressDialog from "../common/ProgressDialog.svelte";
  import { projectStore } from "../../stores/project-store";
  import { BrowserFfmpegExporter } from "../../exporters/browser-ffmpeg-exporter";
  import type { ExportProgress } from "../../types/export";

  export let open = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  let exporting = false;
  let progress = 0;
  let progressMessage = "";
  let error: string | null = null;

  const presets = [
    { id: "project", label: "プロジェクト設定", width: 0, height: 0, fps: 0 },
    { id: "youtube", label: "YouTube  1920×1080 / 30fps", width: 1920, height: 1080, fps: 30 },
    { id: "shorts", label: "Shorts・縦動画  1080×1920 / 30fps", width: 1080, height: 1920, fps: 30 },
    { id: "sns", label: "SNS 正方形  1080×1080 / 30fps", width: 1080, height: 1080, fps: 30 },
  ];

  let selectedPresetId = "project";

  $: selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? presets[0];
  $: exportWidth = selectedPreset.width || $projectStore.settings.width;
  $: exportHeight = selectedPreset.height || $projectStore.settings.height;
  $: exportFps = selectedPreset.fps || $projectStore.settings.fps;

  const exporter = new BrowserFfmpegExporter();

  async function startExport() {
    error = null;
    exporting = true;

    const onProgress = (p: ExportProgress) => {
      progress = p.progress;
      progressMessage = p.message;
    };

    const options = {
      format: "mp4" as const,
      videoCodec: "h264" as const,
      audioCodec: "aac" as const,
      width: exportWidth,
      height: exportHeight,
      fps: exportFps,
    };

    const result = await exporter.export($projectStore, options, onProgress);
    exporting = false;

    if (result.success && result.blob) {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${$projectStore.name}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      dispatch("close");
    } else {
      error = result.error ?? "書き出しに失敗しました";
    }
  }
</script>

<Modal {open} title="動画を書き出す" on:close={() => dispatch("close")}>
  <div class="space-y-4">
    <!-- プリセット選択 -->
    <div>
      <p class="text-xs text-gray-400 mb-1">書き出しプリセット</p>
      <div class="space-y-1">
        {#each presets as preset}
          <label class="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="preset"
              value={preset.id}
              bind:group={selectedPresetId}
              class="accent-accent-blue"
            />
            <span class="text-xs text-gray-300 group-hover:text-white">{preset.label}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- 出力情報 -->
    <div class="bg-dark-600 rounded p-3 text-xs text-gray-400 space-y-1">
      <p>出力形式: MP4 (H.264 / AAC)</p>
      <p>解像度: {exportWidth}×{exportHeight}</p>
      <p>フレームレート: {exportFps}fps</p>
    </div>

    <div class="bg-yellow-900/30 border border-yellow-700/50 rounded p-2 text-xs text-yellow-300">
      ⚠ 長時間・大容量の動画は処理に時間がかかる場合があります。
    </div>

    {#if error}
      <div class="bg-red-900/40 border border-red-700/50 rounded p-2 text-xs text-red-300">
        {error}
      </div>
    {/if}

    <div class="flex gap-2 justify-end">
      <button class="btn-secondary text-xs" on:click={() => dispatch("close")}>キャンセル</button>
      <button class="btn-primary text-xs" on:click={startExport}>書き出し開始</button>
    </div>
  </div>
</Modal>

<ProgressDialog
  open={exporting}
  title="書き出し中..."
  {progress}
  message={progressMessage}
/>
