import { writable } from "svelte/store";

export type LoadingState = "idle" | "loading" | "exporting";

export type UiState = {
  timelineZoom: number;
  exportDialogOpen: boolean;
  loadingState: LoadingState;
  errorMessage: string | null;
  progress: number;
  progressMessage: string;
};

function createUiStore() {
  const { subscribe, update } = writable<UiState>({
    timelineZoom: 100,
    exportDialogOpen: false,
    loadingState: "idle",
    errorMessage: null,
    progress: 0,
    progressMessage: "",
  });

  function setZoom(zoom: number) {
    update((s) => ({ ...s, timelineZoom: Math.max(20, Math.min(500, zoom)) }));
  }

  function zoomIn() {
    update((s) => ({ ...s, timelineZoom: Math.min(500, s.timelineZoom * 1.25) }));
  }

  function zoomOut() {
    update((s) => ({ ...s, timelineZoom: Math.max(20, s.timelineZoom / 1.25) }));
  }

  function openExportDialog() {
    update((s) => ({ ...s, exportDialogOpen: true }));
  }

  function closeExportDialog() {
    update((s) => ({ ...s, exportDialogOpen: false }));
  }

  function setError(msg: string | null) {
    update((s) => ({ ...s, errorMessage: msg }));
  }

  function setLoading(state: LoadingState) {
    update((s) => ({ ...s, loadingState: state }));
  }

  function setProgress(progress: number, message = "") {
    update((s) => ({ ...s, progress, progressMessage: message }));
  }

  return {
    subscribe,
    setZoom,
    zoomIn,
    zoomOut,
    openExportDialog,
    closeExportDialog,
    setError,
    setLoading,
    setProgress,
  };
}

export const uiStore = createUiStore();
