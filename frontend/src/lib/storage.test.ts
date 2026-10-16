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

test("this week runs Monday to Sunday and marks the days practised", async () => {
  const { practisedThisWeek } = await import("./storage.ts");
  const wed = new Date(2026, 9, 14, 12).getTime();                 // Wednesday 14 Oct 2026
  const at = (d: number) => ({ at: new Date(2026, 9, d, 9).getTime(), drill: "pace", name: "", score: 50, wpm: null, fillers: null });
  // Sun 11 Oct is last week; Mon 12 and Wed 14 are this week
  expect(practisedThisWeek([at(11), at(12), at(14)], wed)).toEqual([true, false, true, false, false, false, false]);
});
