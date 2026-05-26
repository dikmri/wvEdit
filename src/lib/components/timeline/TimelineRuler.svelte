<script lang="ts">
  import { secondsToPx } from "../../domain/time";

  export let duration: number;
  export let zoom: number;

  const RULER_HEIGHT = 24;

  $: totalWidth = Math.max(secondsToPx(duration, zoom) + 200, 800);

  // 目盛り間隔を決める（zoomに応じて適切な間隔を選択）
  $: tickInterval = (() => {
    const intervals = [0.1, 0.5, 1, 2, 5, 10, 30, 60];
    for (const iv of intervals) {
      if (secondsToPx(iv, zoom) >= 60) return iv;
    }
    return 60;
  })();

  $: ticks = (() => {
    const result: { time: number; label: string }[] = [];
    let t = 0;
    while (t <= duration + tickInterval) {
      const mins = Math.floor(t / 60);
      const secs = t % 60;
      const label = tickInterval < 1
        ? `${mins}:${String(Math.floor(secs)).padStart(2, "0")}.${String(Math.round((secs % 1) * 10)).padStart(1, "0")}`
        : `${mins}:${String(Math.floor(secs)).padStart(2, "0")}`;
      result.push({ time: t, label });
      t = Math.round((t + tickInterval) * 100) / 100;
    }
    return result;
  })();
</script>

<div
  class="relative bg-dark-700 border-b border-dark-500 overflow-hidden"
  style="height: {RULER_HEIGHT}px; min-width: {totalWidth}px;"
>
  {#each ticks as tick}
    {@const x = secondsToPx(tick.time, zoom)}
    <div
      class="absolute top-0 h-full flex flex-col items-start pointer-events-none"
      style="left: {x}px;"
    >
      <div class="w-px h-3 bg-dark-300 mt-auto"></div>
    </div>
    <span
      class="absolute bottom-1 text-xs text-gray-500 pointer-events-none select-none"
      style="left: {x + 2}px; font-size: 10px;"
    >{tick.label}</span>
  {/each}
</div>
