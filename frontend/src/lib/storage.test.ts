/* The one-time move from the old app's localStorage record (db.ts). */
import { expect, test } from "vitest";
import { migrateLegacy } from "./storage.ts";
import { DRILLS } from "./drills.ts";

const IDS = DRILLS.map(d => d.id);
const AT = Date.UTC(2026, 9, 1);

test("migration keeps real history and settings, and drops what isn't", () => {
  const old = JSON.stringify({
    sessions: [
      { at: AT, drill: "pace", name: "Pace & Pause", score: 71, wpm: 150, fillers: 1, parts: { pace: 90 } },
      { at: "yesterday", drill: "pace", score: 50 },                     // damaged
      { at: AT + 1, drill: "karaoke", score: 99 },                        // not a drill
    ],
    cards: [{ word: "sea", twisterId: "tw-001", box: 2, misses: 0, dueAt: AT }, { word: "" }],
    plan: { day: "2026-10-1", drills: ["pace"], why: {}, done: [] },
    theme: "light", pack: "interview", buzz: { filler: false, pace: "yes" },
  });
  const r = migrateLegacy(old, IDS);
  expect(r.sessions.map(s => s.score)).toEqual([71]);
  expect(r.sessions[0].parts).toEqual({ pace: 90 });
  expect(r.cards.map(c => c.word)).toEqual(["sea"]);
  expect(r).toMatchObject({ theme: "light", pack: "interview", buzz: { filler: false } });
  expect(r.plan).toBeUndefined();                // rebuilt for today
});

test("migration of nothing, or of junk, is an empty record", () => {
  for (const junk of [null, "", "{", "5", "[]", '"x"', '{"sessions":"lots"}'])
    expect(migrateLegacy(junk, IDS)).toEqual({ sessions: [], cards: [], theme: null });
});
