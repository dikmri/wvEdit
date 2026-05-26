<script lang="ts">
  import { uiStore } from "../../stores/ui-store";
</script>

{#if $uiStore.errorMessage}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full mx-4">
    <div class="bg-red-900 border border-red-700 rounded-lg px-4 py-3 flex items-start gap-3 shadow-2xl">
      <span class="text-red-400 text-sm flex-shrink-0">⚠</span>
      <p class="text-xs text-red-200 flex-1 whitespace-pre-wrap">{$uiStore.errorMessage}</p>
      <button
        class="text-red-400 hover:text-red-200 text-sm flex-shrink-0"
        on:click={() => uiStore.setError(null)}
        aria-label="閉じる"
      >✕</button>
    </div>
  </div>
{/if}
