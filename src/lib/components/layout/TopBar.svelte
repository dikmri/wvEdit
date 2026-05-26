<script lang="ts">
  import { projectStore } from "../../stores/project-store";
  import { historyStore } from "../../stores/history-store";
  import { uiStore } from "../../stores/ui-store";
  import { downloadProjectFile, readProjectFile } from "../../persistence/project-json";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher<{
    "new-project": void;
    "import-media": void;
    export: void;
  }>();

  let fileInput: HTMLInputElement;
  let projectInput: HTMLInputElement;

  function handleNewProject() {
    if (confirm("新規プロジェクトを作成しますか？現在のプロジェクトは失われます。")) {
      dispatch("new-project");
    }
  }

  function handleSaveProject() {
    downloadProjectFile($projectStore);
  }

  async function handleOpenProject() {
    projectInput.click();
  }

  async function onProjectFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const project = await readProjectFile(file);
      projectStore.loadProject(project);
      uiStore.setError(null);
    } catch (err) {
      uiStore.setError(
        `プロジェクトを復元しましたが、素材ファイルの再選択が必要です。\n${err instanceof Error ? err.message : ""}`
      );
    }
    (e.target as HTMLInputElement).value = "";
  }
</script>

<header class="flex items-center gap-1 px-3 py-1.5 bg-dark-800 border-b border-dark-600 select-none">
  <!-- ロゴ -->
  <div class="flex items-center gap-2 mr-3">
    <span class="text-accent-blue font-bold text-base">w</span>
    <span class="text-gray-300 font-semibold text-sm">wvEdit</span>
  </div>

  <div class="w-px h-4 bg-dark-500 mx-1"></div>

  <button class="btn-ghost text-xs" on:click={handleNewProject} title="新規プロジェクト">新規</button>
  <button class="btn-ghost text-xs" on:click={handleOpenProject} title="プロジェクトを開く">開く</button>
  <button class="btn-ghost text-xs" on:click={handleSaveProject} title="Ctrl+S">保存</button>

  <div class="w-px h-4 bg-dark-500 mx-1"></div>

  <button class="btn-ghost text-xs" on:click={() => dispatch("import-media")} title="動画を読み込む">
    素材読み込み
  </button>

  <div class="w-px h-4 bg-dark-500 mx-1"></div>

  <button
    class="btn-ghost text-xs"
    on:click={() => projectStore.undo()}
    title="Ctrl+Z"
    disabled={!historyStore.canUndo()}
  >
    ↩ Undo
  </button>
  <button
    class="btn-ghost text-xs"
    on:click={() => projectStore.redo()}
    title="Ctrl+Y"
    disabled={!historyStore.canRedo()}
  >
    Redo ↪
  </button>

  <div class="flex-1"></div>

  <button class="btn-primary text-xs" on:click={() => dispatch("export")}>書き出し</button>
</header>

<input bind:this={projectInput} type="file" accept=".json" class="hidden" on:change={onProjectFileSelected} />
