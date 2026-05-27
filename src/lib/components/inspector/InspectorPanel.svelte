<script lang="ts">
  import { projectStore } from "../../stores/project-store";
  import type { Track } from "../../types/project";

  $: selectedClips = $projectStore.timeline.tracks.flatMap((t) =>
    t.clips.filter((c) => c.selected)
  );
  $: clip = selectedClips.length === 1 ? selectedClips[0] : null;
  $: asset = clip ? $projectStore.assets.find((a) => a.id === clip!.assetId) : null;
  $: track = clip
    ? ($projectStore.timeline.tracks.find((t) => t.clips.some((c) => c.id === clip!.id)) ?? null)
    : null;

  $: showVolumeControl = track?.type === "audio" || clip?.type === "video";
  $: showTextControl = clip?.type === "text";

  function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2);
    return `${m}:${s.padStart(5, "0")}`;
  }

  function onVolumeChange(e: Event) {
    if (!clip || !track) return;
    const vol = Number((e.target as HTMLInputElement).value);
    projectStore.updateClipAudio(track.id, clip.id, { volume: vol });
  }

  function onTextChange(field: string, value: string | number | boolean) {
    if (!clip || !track) return;
    projectStore.updateClipText(track.id, clip.id, { [field]: value } as any);
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

      {#if clip.type !== "text"}
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
      {/if}

      <!-- 音量 -->
      {#if showVolumeControl}
        <div class="border-t border-dark-600"></div>
        <div>
          <p class="text-xs font-semibold text-gray-400 mb-1">音量</p>
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={clip.audio?.volume ?? 1}
              class="flex-1 accent-accent-blue"
              on:input={onVolumeChange}
            />
            <span class="text-xs text-gray-400 w-8 text-right">
              {Math.round((clip.audio?.volume ?? 1) * 100)}%
            </span>
          </div>
        </div>
      {/if}

      <!-- テキスト設定 -->
      {#if showTextControl && clip.text}
        <div class="border-t border-dark-600"></div>
        <div class="space-y-2">
          <p class="text-xs font-semibold text-gray-400">テキスト</p>

          <textarea
            class="w-full bg-dark-600 text-xs text-white rounded px-2 py-1 resize-none border border-dark-500 focus:border-accent-blue outline-none"
            rows="3"
            value={clip.text.text}
            on:input={(e) => onTextChange("text", (e.target as HTMLTextAreaElement).value)}
          ></textarea>

          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 w-14 flex-shrink-0">フォント</label>
            <select
              class="flex-1 bg-dark-600 text-xs text-white rounded px-1 py-1 border border-dark-500"
              value={clip.text.fontFamily}
              on:change={(e) => onTextChange("fontFamily", (e.target as HTMLSelectElement).value)}
            >
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 w-14 flex-shrink-0">サイズ</label>
            <input
              type="number"
              min="12"
              max="300"
              value={clip.text.fontSize}
              class="flex-1 bg-dark-600 text-xs text-white rounded px-2 py-1 border border-dark-500"
              on:input={(e) => onTextChange("fontSize", Number((e.target as HTMLInputElement).value))}
            />
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 w-14 flex-shrink-0">色</label>
            <input
              type="color"
              value={clip.text.color}
              class="w-8 h-6 rounded cursor-pointer border-0"
              on:input={(e) => onTextChange("color", (e.target as HTMLInputElement).value)}
            />
            <span class="text-xs text-gray-500">{clip.text.color}</span>
          </div>

          <!-- 整列 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 w-14 flex-shrink-0">整列</label>
            <div class="flex gap-1">
              {#each [["left", "←"], ["center", "≡"], ["right", "→"]] as [align, icon]}
                <button
                  class="text-xs px-2 py-1 rounded {clip.text.align === align ? 'bg-accent-blue text-white' : 'bg-dark-600 text-gray-400 hover:bg-dark-500'}"
                  on:click={() => onTextChange("align", align)}
                >{icon}</button>
              {/each}
            </div>
          </div>

          <!-- 太字/斜体 -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 w-14 flex-shrink-0">スタイル</label>
            <div class="flex gap-1">
              <button
                class="text-xs px-2 py-1 rounded font-bold {clip.text.bold ? 'bg-accent-blue text-white' : 'bg-dark-600 text-gray-400 hover:bg-dark-500'}"
                on:click={() => onTextChange("bold", !clip!.text!.bold)}
              >B</button>
              <button
                class="text-xs px-2 py-1 rounded italic {clip.text.italic ? 'bg-accent-blue text-white' : 'bg-dark-600 text-gray-400 hover:bg-dark-500'}"
                on:click={() => onTextChange("italic", !clip!.text!.italic)}
              >I</button>
            </div>
          </div>
        </div>
      {/if}

      {#if asset}
        <div class="border-t border-dark-600"></div>
        <div>
          <p class="text-xs font-semibold text-gray-400 mb-1">素材情報</p>
          <div class="text-xs text-gray-500 space-y-0.5">
            {#if asset.width}
              <p>解像度: {asset.width}×{asset.height}</p>
            {/if}
            {#if asset.duration > 0}
              <p>長さ: {formatDuration(asset.duration)}</p>
            {/if}
            <p>形式: {asset.mimeType}</p>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
