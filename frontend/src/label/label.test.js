/* The labelling page's pure helpers (label.js). Moved from the old test.js. */
import assert from "node:assert";
import { test } from "vitest";
import * as L from "./label.js";

test("label: the waveform envelope keeps the extremes of each column", () => {
  const d = new Float32Array([0, .5, -.25, 0, 1, 0, 0, -1]);
  assert.deepStrictEqual([...L.peaks(d, 0, 8, 2)], [-.25, .5, -1, 1]);
});

test("label: a quick label starts a reaction time behind the key press, inside the take", () => {
  assert.deepStrictEqual(L.quickLabel(11, "um", 12), { start:10.65, end:11.1, type:"um" });
  assert.deepStrictEqual(L.quickLabel(0.1, "uh", 12), { start:0, end:0.45, type:"uh" });
  assert.deepStrictEqual(L.quickLabel(11.9, "um", 12), { start:11.55, end:12, type:"um" });
});

test("label: saved labels are valid, ordered, inside the take, and not slivers", () => {
  const got = L.normLabels([
    { start:5, end:4.5, type:"um" },          // dragged backwards: swapped
    { start:1, end:1.02, type:"uh" },         // 20 ms sliver: dropped
    { start:-1, end:0.3, type:"other" },      // clamped to 0
    { start:2, end:2.4, type:"cough" },       // unknown type: dropped
    { start:11.8, end:13, type:"uh" }         // clamped to the end
  ], 12);
  assert.deepStrictEqual(got, [
    { start:0, end:0.3, type:"other" }, { start:4.5, end:5, type:"um" }, { start:11.8, end:12, type:"uh" }]);
});

test("label: the export says what it is, who spoke, and whether it is complete", () => {
  const doc = L.exportDoc({ name:"take-1.webm", duration:30.0004, sampleRate:48000,
    labels:[{ start:2, end:2.4, type:"um" }, { start:9, end:9.3, type:"um" }],
    meta:{ speaker:"s01", mic:"laptop", room:"quiet", consent:true, complete:true } });
  assert.strictEqual(doc.tool, "speakeasy-label/1");
  assert.strictEqual(doc.duration, 30);
  assert.deepStrictEqual(doc.counts, { um:2, uh:0, other:0 });
  assert.strictEqual(doc.complete, true, "an incomplete take can't be used as negatives");
  assert.strictEqual(doc.consent, true);
});
