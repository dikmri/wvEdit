<script lang="ts">
  export let title = "";
  export let open = false;

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) dispatch("close");
  }

  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    on:click={handleBackdrop}
  >
    <div class="bg-dark-700 border border-dark-500 rounded-lg shadow-2xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between px-4 py-3 border-b border-dark-500">
        <h2 class="text-sm font-semibold text-gray-200">{title}</h2>
        <button
          class="text-gray-500 hover:text-gray-200 transition-colors"
          on:click={() => dispatch("close")}
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <div class="p-4">
        <slot />
      </div>
    </div>
  </div>
{/if}
