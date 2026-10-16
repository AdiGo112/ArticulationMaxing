import { expect, test } from "vitest";
import { bubble, ripples } from "./ascii.ts";

test("a bubble wraps words, keeps every line the same width, and ends in a tail", () => {
  const b = bubble("one um so far. when the next one starts, close your mouth. silence is free.", 30).split("\n");
  const body = b.slice(1, -2);
  expect(body.length).toBeGreaterThan(1);
  expect(new Set(b.slice(0, -1).map(l => l.length)).size).toBe(1);   // a clean box
  expect(body.join(" ").replace(/[|]/g, "").replace(/\s+/g, " ").trim())
    .toBe("one um so far. when the next one starts, close your mouth. silence is free.");
  expect(b[b.length - 1].trim()).toBe("\\");
});

test("a word longer than the box still shows, on its own line", () => {
  const b = bubble("supercalifragilistic", 10);
  expect(b).toContain("supercalifragilistic");
});

test("ripples: a grid of the asked size, empty at the centre, densest near it, faint at the edges", () => {
  const g = ripples(120, 30).split("\n");
  expect(g.length).toBe(30);
  expect(g.every(l => l.length === 120)).toBe(true);                 // full width, so centring the block centres the rings
  expect(g[15].slice(55, 65).trim()).toBe("");                       // room for Reel
  const dense = (s: string) => [...s].filter(c => "*#%@=+".includes(c)).length;
  expect(dense(g[15].slice(30, 90))).toBeGreaterThan(dense(g[15].slice(0, 15)));
});
