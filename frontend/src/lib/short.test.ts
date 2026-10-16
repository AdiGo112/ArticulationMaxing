/* The too-short guard: no confident number from a take that can't support one. */
import { expect, test } from "vitest";
import { tooShort } from "./scoring.ts";

const free = { secs: 30, speakSecs: 20, words: 60, transcript: true, reading: false };

test("a real take scores; a short or silent one doesn't", () => {
  expect(tooShort(free)).toBeNull();
  expect(tooShort({ ...free, secs: 2.5, speakSecs: 2, words: 17 })).toMatch(/ten seconds/);   // the 62 that started this
  expect(tooShort({ ...free, transcript: false, words: 0, speakSecs: 0.5 })).toMatch(/voice/);
  expect(tooShort({ ...free, speakSecs: 0.5 })).toBeNull();          // the words came through: voice detection was wrong
  expect(tooShort({ ...free, words: 5 })).toMatch(/few words/);
});

test("a set passage may be quick, and the audio-only path needs no words", () => {
  const twister = { secs: 4, speakSecs: 3, words: 9, transcript: true, reading: true };
  expect(tooShort(twister)).toBeNull();
  expect(tooShort({ ...twister, words: 1 })).toMatch(/few words/);
  expect(tooShort({ ...free, transcript: false, words: 0 })).toBeNull();                      // Firefox
});
