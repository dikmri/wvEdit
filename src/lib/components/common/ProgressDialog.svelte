<script lang="ts">
  export let open = false;
  export let title = "処理中...";
  export let progress = 0;
  export let message = "";
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
    <div class="bg-dark-700 border border-dark-500 rounded-lg shadow-2xl w-full max-w-sm mx-4 p-6">
      <h2 class="text-sm font-semibold text-gray-200 mb-4">{title}</h2>

      <div class="w-full bg-dark-500 rounded-full h-2 mb-3">
        <div
          class="bg-accent-blue h-2 rounded-full transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>

      <p class="text-xs text-gray-400">{message || "..."}</p>
    </div>
  </div>
{/if}
