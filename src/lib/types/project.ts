export type AspectRatio = "16:9" | "9:16" | "1:1" | "custom";

export type ProjectSettings = {
  width: number;
  height: number;
  fps: number;
  sampleRate: number;
  aspectRatio: AspectRatio;
  backgroundColor: string;
};

export type MediaAsset = {
  id: string;
  type: "video" | "audio" | "image";
  name: string;
  fileName: string;
  objectUrl?: string;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  size: number;
  mimeType: string;
  createdAt: string;
};

export type ClipTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type AudioSettings = {
  volume: number;
  muted: boolean;
  fadeIn: number;
  fadeOut: number;
};

export type TextSettings = {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
};

export type Effect = {
  id: string;
  type: "blur" | "mosaic" | "brightness" | "contrast" | "saturation";
  enabled: boolean;
  params: Record<string, number | string | boolean>;
};

export type ClipType = "video" | "audio" | "text" | "image";

export type Clip = {
  id: string;
  assetId: string;
  type: ClipType;
  trackId: string;
  timelineStart: number;
  timelineEnd: number;
  sourceStart: number;
  sourceEnd: number;
  name: string;
  selected: boolean;
  transform?: ClipTransform;
  audio?: AudioSettings;
  text?: TextSettings;
  effects?: Effect[];
};

export type TrackType = "video" | "audio" | "text" | "image";

export type Track = {
  id: string;
  type: TrackType;
  name: string;
  muted: boolean;
  locked: boolean;
  clips: Clip[];
};

export type Timeline = {
  duration: number;
  tracks: Track[];
};

export type WvEditProject = {
  appName: "wvEdit";
  version: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  assets: MediaAsset[];
  timeline: Timeline;
};
