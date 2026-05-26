import { describe, it, expect } from "vitest";
import { splitClip, moveClip, trimClipLeft, trimClipRight, deleteClipsFromTrack } from "./operations";
import type { Clip, Track } from "../types/project";

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: "clip1",
  assetId: "asset1",
  type: "video",
  trackId: "track1",
  timelineStart: 0,
  timelineEnd: 10,
  sourceStart: 0,
  sourceEnd: 10,
  name: "Test Clip",
  selected: false,
  ...overrides,
});

describe("splitClip", () => {
  it("should split a clip at the given time", () => {
    const clip = makeClip();
    const result = splitClip(clip, 5, 30);
    expect(result).not.toBeNull();
    const [left, right] = result!;
    expect(left.timelineEnd).toBeCloseTo(5);
    expect(right.timelineStart).toBeCloseTo(5);
    expect(left.sourceEnd).toBeCloseTo(5);
    expect(right.sourceStart).toBeCloseTo(5);
  });

  it("should return null if split is outside clip range", () => {
    const clip = makeClip();
    expect(splitClip(clip, -1, 30)).toBeNull();
    expect(splitClip(clip, 10, 30)).toBeNull();
    expect(splitClip(clip, 0, 30)).toBeNull();
  });

  it("should handle clips with non-zero sourceStart", () => {
    const clip = makeClip({ sourceStart: 5, sourceEnd: 15 });
    const result = splitClip(clip, 3, 30);
    expect(result).not.toBeNull();
    const [left, right] = result!;
    expect(left.sourceEnd).toBeCloseTo(8); // 5 + (3 - 0)
    expect(right.sourceStart).toBeCloseTo(8);
  });
});

describe("moveClip", () => {
  it("should move clip to new start position", () => {
    const clip = makeClip({ timelineEnd: 10 });
    const moved = moveClip(clip, 5, 30);
    expect(moved.timelineStart).toBeCloseTo(5);
    expect(moved.timelineEnd).toBeCloseTo(15);
  });

  it("should clamp to 0", () => {
    const clip = makeClip();
    const moved = moveClip(clip, -5, 30);
    expect(moved.timelineStart).toBe(0);
  });
});

describe("trimClipLeft", () => {
  it("should trim left edge", () => {
    const clip = makeClip({ sourceStart: 0, sourceEnd: 10, timelineStart: 0, timelineEnd: 10 });
    const trimmed = trimClipLeft(clip, 2, 30);
    expect(trimmed.timelineStart).toBeCloseTo(2);
    expect(trimmed.sourceStart).toBeCloseTo(2);
  });
});

describe("trimClipRight", () => {
  it("should trim right edge", () => {
    const clip = makeClip({ sourceStart: 0, sourceEnd: 10, timelineStart: 0, timelineEnd: 10 });
    const trimmed = trimClipRight(clip, 8, 30);
    expect(trimmed.timelineEnd).toBeCloseTo(8);
    expect(trimmed.sourceEnd).toBeCloseTo(8);
  });
});

describe("deleteClipsFromTrack", () => {
  it("should delete specified clips", () => {
    const track: Track = {
      id: "track1",
      type: "video",
      name: "Video 1",
      muted: false,
      locked: false,
      clips: [makeClip({ id: "c1" }), makeClip({ id: "c2" }), makeClip({ id: "c3" })],
    };
    const result = deleteClipsFromTrack(track, new Set(["c1", "c3"]));
    expect(result.clips).toHaveLength(1);
    expect(result.clips[0].id).toBe("c2");
  });
});
