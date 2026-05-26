<script lang="ts">
  import { projectStore } from "../../stores/project-store";

  $: selectedClips = $projectStore.timeline.tracks.flatMap((t) =>
    t.clips.filter((c) => c.selected)
  );
  $: clip = selectedClips.length === 1 ? selectedClips[0] : null;
  $: asset = clip ? $projectStore.assets.find((a) => a.id === clip!.assetId) : null;

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2);
    return `${m}:${s.padStart(5, "0")}`;
  }
</script>

<div class="flex flex-col h-full bg-dark-800 border-l border-dark-600 overflow-y-auto">
  <div class="px-3 py-2 border-b border-dark-600">
    <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">インスペクター</span>
  </div>

  {#if !clip}
    <div class="flex-1 flex items-center justify-center">
      <p class="text-xs text-gray-600 text-center">クリップを選択してください</p>
    </div>
  {:else}
    <div class="p-3 space-y-3">
      <!-- クリップ情報 -->
      <div>
        <p class="text-xs font-semibold text-gray-400 mb-1">クリップ</p>
        <p class="text-xs text-gray-300 truncate">{clip.name}</p>
        {#if asset}
          <p class="text-xs text-gray-500">素材: {asset.fileName}</p>
        {/if}
      </div>

      <div class="border-t border-dark-600"></div>

      <!-- タイムライン位置 -->
      <div>
        <p class="text-xs font-semibold text-gray-400 mb-1">タイムライン</p>
        <div class="grid grid-cols-2 gap-1 text-xs">
          <div>
            <p class="text-gray-500">開始</p>
            <p class="text-gray-300 font-mono">{formatDuration(clip.timelineStart)}</p>
          </div>
          <div>
            <p class="text-gray-500">終了</p>
            <p class="text-gray-300 font-mono">{formatDuration(clip.timelineEnd)}</p>
          </div>
          <div>
            <p class="text-gray-500">長さ</p>
            <p class="text-gray-300 font-mono">{formatDuration(clip.timelineEnd - clip.timelineStart)}</p>
          </div>
        </div>
      </div>

      <div class="border-t border-dark-600"></div>

      <!-- ソース範囲 -->
      <div>
        <p class="text-xs font-semibold text-gray-400 mb-1">ソース</p>
        <div class="grid grid-cols-2 gap-1 text-xs">
          <div>
            <p class="text-gray-500">In</p>
            <p class="text-gray-300 font-mono">{formatDuration(clip.sourceStart)}</p>
          </div>
          <div>
            <p class="text-gray-500">Out</p>
            <p class="text-gray-300 font-mono">{formatDuration(clip.sourceEnd)}</p>
          </div>
        </div>
      </div>

      {#if asset}
        <div class="border-t border-dark-600"></div>
        <div>
          <p class="text-xs font-semibold text-gray-400 mb-1">素材情報</p>
          <div class="text-xs text-gray-500 space-y-0.5">
            {#if asset.width}
              <p>解像度: {asset.width}×{asset.height}</p>
            {/if}
            <p>長さ: {formatDuration(asset.duration)}</p>
            <p>形式: {asset.mimeType}</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
