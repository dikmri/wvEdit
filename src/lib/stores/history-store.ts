import type { WvEditProject } from "../types/project";

const MAX_HISTORY = 50;

function createHistoryStore() {
  let undoStack: WvEditProject[] = [];
  let redoStack: WvEditProject[] = [];

  function push(state: WvEditProject) {
    undoStack.push(state);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
  }

  function undo(current: WvEditProject): WvEditProject | null {
    if (undoStack.length === 0) return null;
    redoStack.push(current);
    return undoStack.pop()!;
  }

  function redo(current: WvEditProject): WvEditProject | null {
    if (redoStack.length === 0) return null;
    undoStack.push(current);
    return redoStack.pop()!;
  }

  function clear() {
    undoStack = [];
    redoStack = [];
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  return { push, undo, redo, clear, canUndo, canRedo };
}

export const historyStore = createHistoryStore();
