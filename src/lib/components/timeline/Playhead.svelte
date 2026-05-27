<script lang="ts">
  import { playheadTime } from "../../stores/playback-store";
  import { secondsToPx } from "../../domain/time";

  export let zoom: number;
  export let height: number = 200;

  // playheadTime を直接購読。Timeline 全体を経由しないため
  // Timeline コンポーネントの再描画を誘発しない。
  $: x = secondsToPx($playheadTime, zoom);
</script>

<div
  class="absolute top-0 pointer-events-none z-20"
  style="left: {x}px; height: {height}px;"
>
  <div class="relative">
    <div class="absolute -translate-x-1/2" style="top: 0; left: 0;">
      <div
        style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #f87171;"
      ></div>
    </div>
  </div>
  <div class="absolute w-px bg-red-400 opacity-80" style="left: -0.5px; top: 8px; height: calc(100% - 8px);"></div>
</div>
