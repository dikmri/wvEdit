<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "../common/Modal.svelte";
  import ProgressDialog from "../common/ProgressDialog.svelte";
  import { projectStore } from "../../stores/project-store";
  import { uiStore } from "../../stores/ui-store";
  import { BrowserFfmpegExporter } from "../../exporters/browser-ffmpeg-exporter";
  import type { ExportProgress } from "../../types/export";

  export let open = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  let exporting = false;
  let progress = 0;
  let progressMessage = "";
  let error: string | null = null;

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
      width: $projectStore.settings.width,
      height: $projectStore.settings.height,
      fps: $projectStore.settings.fps,
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
    <div class="bg-dark-600 rounded p-3 text-xs text-gray-400 space-y-1">
      <p>出力形式: MP4 (H.264 / AAC)</p>
      <p>解像度: {$projectStore.settings.width}×{$projectStore.settings.height}</p>
      <p>フレームレート: {$projectStore.settings.fps}fps</p>
    </div>

    <div class="bg-yellow-900/30 border border-yellow-700/50 rounded p-2 text-xs text-yellow-300">
      ⚠ 長時間・大容量の動画は処理に時間がかかる場合があります。
      30分以内の動画を推奨します。
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
