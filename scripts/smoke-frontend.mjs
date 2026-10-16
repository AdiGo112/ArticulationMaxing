/* smoke-frontend.mjs — The React port in headless Chrome, with Chrome's fake
   microphone (a test tone), so a run goes all the way through: room
   calibration, countdown, the frame loop, MediaRecorder, scoring, and the
   save to IndexedDB. Also checks the one-time move of the old app's
   localStorage history. Run after `npm run build -w frontend`:
   node scripts/smoke-frontend.mjs                                       */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { check, failures, launch, sleep } from "./cdp.mjs";

const dir = join(import.meta.dirname, "..", "frontend");
const PORT = 4173, origin = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [join(dir, "node_modules/vite/bin/vite.js"), "preview", "--port", PORT, "--strictPort"], { cwd: dir });
await new Promise((res, rej) => {
  server.stdout.on("data", d => String(d).includes(String(PORT)) && res());
  server.on("exit", c => rej(new Error("vite preview exited with " + c + " — did you build frontend/ first?")));
  setTimeout(() => rej(new Error("vite preview did not start")), 15000);
});

const { ev, until, errors, open, close } = await launch([
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]);
const text = () => ev(`document.body.innerText`);
const press = label => ev(`[...document.querySelectorAll("button")].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.click() ?? "missing"`);
const stored = () => ev(`new Promise(res => { const r = indexedDB.open("speakeasy"); r.onsuccess = () =>
  { const g = r.result.transaction("kv").objectStore("kv").get("record"); g.onsuccess = () => { res(g.result ? g.result.sessions.length : -1); r.result.close(); }; };
  r.onerror = () => res(-2); })`);

console.log(`Speakeasy React port smoke test — ${origin}`);

/* the old app's history comes across once, damaged entries dropped */
await open(origin);
await until(`document.body.innerText.includes("sessions stored")`, 8000);
await ev(`new Promise(res => { const d = indexedDB.deleteDatabase("speakeasy"); d.onsuccess = d.onerror = d.onblocked = () => res(true); })`);
await ev(`localStorage.setItem("speakeasy.v1", JSON.stringify({ theme: "dark", sessions: [
  { at: ${Date.UTC(2026, 9, 1)}, drill: "pace", name: "Pace & Pause", score: 71, wpm: 150, fillers: 1 },
  { at: "broken", drill: "pace", score: 50 }] })), true`);
await open(origin);
check("loads and lists the drills", await until(`document.querySelectorAll("button").length >= 6`, 8000));
check("migration: old history arrives, damaged entry dropped", await until(`document.body.innerText.includes("1 sessions stored")`), await text());
check("migration: written to IndexedDB", (await stored()) === 1);
check("load: no script errors", errors.length === 0, errors.join(" | "));

/* a real run on the fake mic */
await press("Diction Gym");
check("drill stages its twister", await until(`document.body.innerText.includes("Phase: idle")`));
await press("Start speaking");
check("run: calibrates and counts down", await until(`/Phase: (calibrating|countdown)/.test(document.body.innerText)`, 3000), await text());
check("run: starts after the countdown", await until(`document.body.innerText.includes("Phase: running")`, 8000), await text());
check("run: live meters update", await until(`/Time left \\d+ s/.test(document.body.innerText)`, 3000));
await sleep(2500);
await press("Stop");
check("run: finishes with a score", await until(`/Score \\d+/.test(document.body.innerText)`, 5000), await text());
check("run: saved to IndexedDB", (await stored()) === 2);
check("run: the recording plays back", await until(`!!document.querySelector("audio[src^='blob:']")`, 3000));
check("run: no script errors", errors.length === 0, errors.join(" | "));

await press("Run it again");
check("again: the same twister re-arms", await until(`document.body.innerText.includes("Phase: idle")`));

close(); server.kill();
await sleep(300);                  // Chrome may still hold its profile on Windows
console.log(failures() ? `\n${failures()} check(s) failed` : "\nsmoke ok");
process.exit(failures() ? 1 : 0);
