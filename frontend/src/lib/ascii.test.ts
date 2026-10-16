import { expect, test } from "vitest";
import { bubble } from "./ascii.ts";

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
