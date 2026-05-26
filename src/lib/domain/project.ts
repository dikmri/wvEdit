import type { WvEditProject } from "../types/project";

export const DEFAULT_PROJECT_SETTINGS = {
  width: 1920,
  height: 1080,
  fps: 30,
  sampleRate: 48000,
  aspectRatio: "16:9" as const,
  backgroundColor: "#000000",
};

export function createNewProject(name = "新規プロジェクト"): WvEditProject {
  const now = new Date().toISOString();
  return {
    appName: "wvEdit",
    version: "0.1.0",
    projectId: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_PROJECT_SETTINGS },
    assets: [],
    timeline: {
      duration: 0,
      tracks: [
        {
          id: crypto.randomUUID(),
          type: "video",
          name: "Video 1",
          muted: false,
          locked: false,
          clips: [],
        },
        {
          id: crypto.randomUUID(),
          type: "audio",
          name: "Audio 1",
          muted: false,
          locked: false,
          clips: [],
        },
      ],
    },
  };
}
