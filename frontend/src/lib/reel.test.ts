/* Reel's pixels: what DESIGN.md promises about the mascot. */
import { expect, test } from "vitest";
import { FRAMES, SLOTS, STATES, frames, paint, shade, type ReelState } from "./reel.ts";

const cells = (path: string) => (path.match(/M-?\d+ -?\d+/g) || []).map(m => m.slice(1).split(" ").map(Number));

test("every state has 8 frames in every colour slot", () => {
  for (const s of Object.keys(STATES) as ReelState[]) {
    const { layers, dur } = frames(s);
    expect(dur).toBeGreaterThan(0);
    for (const c of SLOTS) expect(layers[c]).toHaveLength(FRAMES);
  }
});

test("eyes are small: 1 × 2 pixels each when open", () => {
  const eyes = cells(paint({ eyes: "still" }, 0).K!);
  expect(eyes).toHaveLength(4);
  const xs = new Set(eyes.map(([x]) => x));
  expect([...xs].sort((a, b) => a - b)).toEqual([5, 12]);
});

test("hands are 2 × 2 nubs outside the body", () => {
  const body = cells(paint({}, 0).A!);
  const left = body.filter(([x]) => x < 1), right = body.filter(([x]) => x > 16);
  expect(left).toHaveLength(4);
  expect(right).toHaveLength(4);
});

test("recording runs the tape; a pause doesn't", () => {
  const rec = frames("record").layers.C, still = frames("pause").layers.C;
  expect(new Set(rec).size).toBeGreaterThan(1);                  // dashes move frame to frame
  expect(still.every(p => p === "M0 0")).toBe(true);
});

test("rewinding runs the tape the other way", () => {
  const fwd = paint({ tape: 1 }, 1).C, back = paint({ tape: -1 }, 1).C;
  expect(fwd).not.toEqual(back);
});

test("the REC light is the alert slot, and only while recording", () => {
  expect(frames("record").layers.R.some(p => p !== "M0 0")).toBe(true);
  expect(frames("idle").layers.R.every(p => p === "M0 0")).toBe(true);
});

test("states look different from each other", () => {
  // some share a first pose (idle, pause, play all start standing still);
  // the whole loop plus its caption is what tells them apart
  const look = (s: ReelState) => { const f = frames(s); return JSON.stringify([f.acc, SLOTS.map(c => f.layers[c])]); };
  const all = (Object.keys(STATES) as ReelState[]).map(look);
  expect(new Set(all).size).toBe(all.length);
});

test("the shade is the body colour at 48 %", () => {
  expect(shade("#FF7F6A")).toBe("#7a3d33");
});
