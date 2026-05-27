<script lang="ts">
  import { projectStore } from "../../stores/project-store";
  import { uiStore } from "../../stores/ui-store";
  import { loadMediaFile } from "../../media/file-loader";
  import type { MediaAsset } from "../../types/project";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher<{ "add-to-timeline": MediaAsset; "add-text": void; "add-subtitle": void }>();

  let fileInput: HTMLInputElement;
  let dragOver = false;

  async function loadFiles(files: FileList | File[]) {
    uiStore.setLoading("loading");
    for (const file of Array.from(files)) {
      try {
        const asset = await loadMediaFile(file);
        projectStore.addAsset(asset);
        console.log("[file-load]", asset.name, asset.duration);
      } catch (err) {
        uiStore.setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      }
    }
    uiStore.setLoading("idle");
  }

  function handleFileInput(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (files?.length) loadFiles(files);
    (e.target as HTMLInputElement).value = "";
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files.length) loadFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  // Media PanelからタイムラインへドラッグするためのdataTransfer
  function onItemDragStart(e: DragEvent, asset: MediaAsset) {
    e.dataTransfer?.setData("assetId", asset.id);
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="flex flex-col h-full bg-dark-800 border-r border-dark-600"
  on:drop={handleDrop}
  on:dragover={handleDragOver}
  on:dragleave={() => (dragOver = false)}
>
  <div class="flex items-center justify-between px-3 py-2 border-b border-dark-600">
    <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">素材</span>
    <div class="flex gap-1">
      <button class="btn-ghost text-xs px-1.5" on:click={() => dispatch("add-text")} title="テキストを追加 (自由配置)">T+</button>
      <button class="btn-ghost text-xs px-1.5" on:click={() => dispatch("add-subtitle")} title="字幕を追加">字+</button>
      <button class="btn-ghost text-xs" on:click={() => fileInput.click()}>+ 追加</button>
    </div>
  </div>

  <!-- ドロップゾーン / ファイル一覧 -->
  {#if $projectStore.assets.length === 0}
    <div
      class="flex-1 flex flex-col items-center justify-center text-center p-4 {dragOver
        ? 'bg-dark-600 border-2 border-dashed border-accent-blue'
        : ''}"
    >
      <div class="text-3xl mb-2">🎬</div>
      <p class="text-xs text-gray-500">動画ファイルをドロップ<br />または「+ 追加」ボタンから読み込む</p>
    </div>
  {:else}
    <div class="flex-1 overflow-y-auto">
      {#each $projectStore.assets as asset (asset.id)}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="flex items-start gap-2 px-2 py-1.5 hover:bg-dark-600 cursor-grab border-b border-dark-700 group"
          draggable="true"
          on:dragstart={(e) => onItemDragStart(e, asset)}
          on:dblclick={() => dispatch("add-to-timeline", asset)}
          title="ダブルクリックまたはタイムラインへドラッグ"
        >
          <!-- アイコン -->
          <div class="w-8 h-8 bg-dark-600 rounded flex-shrink-0 flex items-center justify-center text-sm">
            {#if asset.type === "video"}🎬
            {:else if asset.type === "audio"}🎵
            {:else}🖼️{/if}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-300 truncate">{asset.name}</p>
            <p class="text-xs text-gray-500">
              {#if asset.duration > 0}{formatDuration(asset.duration)}{/if}
              {#if asset.width} · {asset.width}×{asset.height}{/if}
              · {formatSize(asset.size)}
            </p>
          </div>
          <button
            class="btn-ghost text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
            title="削除"
            on:click|stopPropagation={() => projectStore.removeAsset(asset.id)}
          >✕</button>
        </div>
      {/each}
    </div>
    {#if dragOver}
      <div class="px-3 py-2 text-xs text-accent-blue text-center border-t border-dark-600">
        ここにドロップして追加
      </div>
    {/if}
  {/if}
</div>

<input
  bind:this={fileInput}
  type="file"
  accept="video/*,audio/*,image/*"
  multiple
  class="hidden"
  on:change={handleFileInput}
/>
