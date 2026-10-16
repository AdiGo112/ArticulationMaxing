/* The logic behind Progress, Drills, Your texts and the backup's texts. */
import { expect, test } from "vitest";
import { ago, drillStats, headline, DRILLS, type Session } from "./drills.ts";
import { exportBackup, mergeBackup, parseBackup, type SavedText } from "./storage.ts";

const IDS = DRILLS.map(d => d.id);
const T0 = new Date(2026, 9, 10, 9, 0).getTime();
const DAY = 864e5;
const s = (i: number, o: Partial<Session> = {}): Session =>
  ({ at: T0 + i * DAY, drill: "filler", name: "Filler Hunt", score: 60, wpm: 150, fillers: 2, ...o });

test("headline: count, average of the last 30, best, and median pace", () => {
  expect(headline([])).toBeNull();
  const h = headline([s(0, { score: 40, wpm: 300 }), s(1, { score: 80, wpm: 140 }), s(2, { score: 60, wpm: null }), s(3, { wpm: 150 })])!;
  expect(h).toEqual({ sessions: 4, avg: 60, best: 80, pace: 150 });     // the rushed 300 doesn't drag the median
  expect(headline([s(0, { wpm: null })])!.pace).toBeNull();
});

test("drillStats: best, last and count per drill", () => {
  const d = drillStats([s(0, { score: 70 }), s(2, { score: 50 }), s(1, { drill: "echo", score: 90 })]);
  expect(d.filler).toEqual({ best: 70, last: T0 + 2 * DAY, n: 2 });
  expect(d.echo.n).toBe(1);
  expect(d.pace).toBeUndefined();
});

test("ago counts calendar days, not 24-hour spans", () => {
  const now = new Date(2026, 9, 10, 0, 30).getTime();
  expect(ago(null, now)).toBe("never");
  expect(ago(new Date(2026, 9, 10, 0, 5).getTime(), now)).toBe("today");
  expect(ago(new Date(2026, 9, 9, 23, 50).getTime(), now)).toBe("yesterday");   // 40 minutes ago, but yesterday
  expect(ago(now - 3 * DAY, now)).toBe("3 days ago");
  expect(ago(now - 9 * DAY, now)).toBe("last week");
  expect(ago(now - 30 * DAY, now)).toBe("10 Sept");
});

test("backup carries saved texts, drops bad ones, and a text already here wins", () => {
  const mine: SavedText = { id: "a1", title: "Best man speech", text: "Good evening, everyone.", at: T0 };
  const file = parseBackup(JSON.stringify(exportBackup({ sessions: [], cards: [], texts: [
    { ...mine, text: "an older draft" }, { id: "b2", title: "", text: "Q3 update.", at: T0 },
    { id: "c3", title: "x", text: "", at: T0 }, { id: "d4", text: "no title", at: T0 }, "nope",
  ] as SavedText[] }, T0)), IDS);
  expect(file.texts.map(t => t.id)).toEqual(["a1", "b2"]);
  expect(file.dropped).toBe(3);
  const m = mergeBackup({ sessions: [], cards: [], texts: [mine] }, file);
  expect(m.record.texts).toEqual([mine, file.texts[1]]);
  // backups made before texts existed still restore
  expect(parseBackup(JSON.stringify({ kind: "speakeasy-backup", version: 1, sessions: [] }), IDS).texts).toEqual([]);
});
