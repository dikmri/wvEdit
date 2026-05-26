<script lang="ts">
  import { secondsToPx } from "../../domain/time";

  export let currentTime: number;
  export let zoom: number;
  export let height: number = 200;

  $: x = secondsToPx(currentTime, zoom);
</script>

<div
  class="absolute top-0 pointer-events-none z-20"
  style="left: {x}px; height: {height}px;"
>
  <!-- 三角ヘッド -->
  <div class="relative">
    <div
      class="absolute -translate-x-1/2"
      style="top: 0; left: 0;"
    >
      <div
        style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #f87171;"
      ></div>
    </div>
  </div>
  <!-- ライン -->
  <div class="absolute w-px bg-red-400 opacity-80" style="left: -0.5px; top: 8px; height: calc(100% - 8px);"></div>
</div>
