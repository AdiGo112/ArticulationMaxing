/* smoke-frontend.mjs — The React port in headless Chrome, with Chrome's fake
   microphone (a test tone), so a run goes all the way through: room check,
   countdown, the frame loop, MediaRecorder, scoring, the report, and the save
   to IndexedDB. Also: the one-time move of the old app's history, the goal
   pack, the live logo, the phone layout, and the label page (a dev page, served
   by the Vite dev server since it is never built). Run after a build:
   cd frontend && npm run build && node ../scripts/smoke-frontend.mjs      */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { check, failures, launch, sleep } from "./cdp.mjs";

const dir = join(import.meta.dirname, "..", "frontend");
const PORT = 4173, origin = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [join(dir, "node_modules/vite/bin/vite.js"), "preview", "--port", PORT, "--strictPort"], { cwd: dir });
const DEV = 5174, devOrigin = `http://localhost:${DEV}`;
const dev = spawn(process.execPath, [join(dir, "node_modules/vite/bin/vite.js"), "--port", DEV, "--strictPort"], { cwd: dir });
await new Promise((res, rej) => {
  dev.stdout.on("data", d => String(d).includes(String(DEV)) && res());
  dev.on("exit", c => rej(new Error("vite dev exited with " + c)));
  setTimeout(() => rej(new Error("vite dev did not start")), 15000);
});
await new Promise((res, rej) => {
  server.stdout.on("data", d => String(d).includes(String(PORT)) && res());
  server.on("exit", c => rej(new Error("vite preview exited with " + c + " — did you build frontend/ first?")));
  setTimeout(() => rej(new Error("vite preview did not start")), 15000);
});

const { ev, until, errors, open, close, send } = await launch([
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]);
const text = () => ev(`document.body.innerText`);
const reels = () => ev(`document.querySelectorAll("svg[aria-label^='Reel']").length`);   // DESIGN.md: one per screen
const press = label => ev(`[...document.querySelectorAll("button, a")].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.click() ?? "missing"`);
const stored = () => ev(`new Promise(res => { const r = indexedDB.open("speakeasy"); r.onsuccess = () =>
  { const g = r.result.transaction("kv").objectStore("kv").get("record"); g.onsuccess = () => { res(g.result ? g.result.sessions.length : -1); r.result.close(); }; };
  r.onerror = () => res(-2); })`);

console.log(`Speakeasy React port smoke test — ${origin}`);

/* the old app's history comes across once, damaged entries dropped */
await open(origin);
await until(`!!document.querySelector(".onair")`, 8000);
await ev(`new Promise(res => { const d = indexedDB.deleteDatabase("speakeasy"); d.onsuccess = d.onerror = d.onblocked = () => res(true); })`);
await ev(`localStorage.setItem("speakeasy.v1", JSON.stringify({ theme: "dark", sessions: [
  { at: ${Date.UTC(2026, 9, 1)}, drill: "pace", name: "Pace & Pause", score: 71, wpm: 150, fillers: 1 },
  { at: "broken", drill: "pace", score: 50 }] })), true`);
await open(origin);
check("home: logo, path and Reel render", await until(`!!document.querySelector(".onair") && document.querySelectorAll(".node").length >= 5 && !!document.querySelector("svg[aria-label^='Reel']")`, 8000), await text());
check("home: one Reel", (await reels()) === 1, "found " + (await reels()));
check("home: the logo's light is off", await ev(`!document.querySelector(".onair.live")`));
check("migration: old history arrives, damaged entry dropped", (await stored()) === 1);
check("home: no script errors", errors.length === 0, errors.join(" | "));

/* goal packs: picking one rebuilds today's untouched plan around it */
await ev(`[...document.querySelectorAll("label")].find(l => l.textContent.trim() === "job interview")?.click(), true`);
check("pack: the plan takes two of the pack's drills", await until(`document.body.innerText.includes("Impromptu") && document.body.innerText.includes("Filler Hunt")`));

/* a real run on the fake mic */
await open(origin + "/#/drill/diction");
check("booth: stages the twister", await until(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("START SPEAKING"))`), await text());
await press("▶ START SPEAKING");
check("run: room check, then countdown", await until(`!!document.querySelector("[role=dialog]")`, 3000), await text());
check("countdown: one Reel", (await reels()) === 1, "found " + (await reels()));
check("run: starts after the countdown", await until(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("STOP"))`, 8000), await text());
check("run: the logo goes live", await ev(`!!document.querySelector(".onair.live")`));
check("run: REC shows the clock", await until(`/REC \\d+:\\d\\d/.test(document.body.innerText)`, 3000));
await sleep(2500);
await press("■ STOP");
check("run: ends on the report with a score", await until(`location.hash === "#/report" && !!document.querySelector("[aria-label^='Score ']")`, 6000), await text());
check("report: one Reel", (await reels()) === 1, "found " + (await reels()));
check("run: saved to IndexedDB", (await stored()) === 2);
check("run: the recording can play", await until(`!!document.querySelector("audio[src^='blob:']")`, 3000));
check("run: no script errors", errors.length === 0, errors.join(" | "));

await press("↻ same prompt again");
check("again: back in the booth for the same drill", await until(`location.hash === "#/drill/diction" && document.body.innerText.includes("START SPEAKING")`));

/* phone: the side nav becomes a tab bar. Widths are checked against 390, not innerWidth:
   mobile emulation widens the layout viewport to fit content that overflows. */
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await open(origin + "/#/");
check("phone: tab bar shown, side nav hidden", await until(`getComputedStyle(document.querySelector(".tabs")).display === "grid" && getComputedStyle(document.querySelector(".side")).display === "none"`));
check("phone: home fits the width", await ev(`document.documentElement.scrollWidth <= 391`), await ev(`document.documentElement.scrollWidth + " px wide on a 390 px phone"`));
await open(origin + "/#/report");
check("phone: the report fits the width", await until(`!!document.querySelector("[aria-label^='Score ']") && document.documentElement.scrollWidth <= 391`), await ev(`document.documentElement.scrollWidth + " px wide on a 390 px phone"`));

/* the label page, driven with real input events */
await send("Emulation.clearDeviceMetricsOverride");
await open(devOrigin + "/label.html#demo");
const loaded = await until(`document.querySelectorAll("#list tr").length === 3`, 8000);
check("label: demo take loads with 3 labels", loaded, await text());
if(loaded){
  const box = await ev(`(() => { const r = document.getElementById("main").getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height }; })()`);
  const x = t => box.x + t / 12 * box.w, y = box.y + box.h / 2;
  const mouse = (type, px) => send("Input.dispatchMouseEvent", { type, x: px, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  const click = async t => { await mouse("mousePressed", x(t)); await mouse("mouseReleased", x(t)); };
  const drag = async (a, b) => { await mouse("mousePressed", x(a)); for(let k = 1; k <= 6; k++) await mouse("mouseMoved", x(a) + (x(b) - x(a)) * k / 6); await mouse("mouseReleased", x(b)); };
  const key = async (k, code, vk) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, text: k.length === 1 ? k : undefined });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
  };
  const rows = () => ev(`[...document.querySelectorAll("#list tr")].map(tr => [...tr.children].slice(0, 3).map(td => td.textContent.trim()).join(" ")).join(" | ")`);
  await drag(6.0, 6.5); await key("2", "Digit2", 50);
  check("label: drag + 2 adds an uh", (await rows()).includes("uh 0:06.00 0:06.50"));
  await click(1.4); await key("Delete", "Delete", 46);
  check("label: click + Delete removes a label", !(await rows()).includes("um 0:01.20"));
  await click(4.2); await key("3", "Digit3", 51);
  check("label: select + 3 retypes", (await rows()).includes("other 0:04.05"));
  await drag(8.9, 9.5);
  check("label: dragging an edge resizes", (await rows()).includes("other 0:08.30 0:09.50"));
  await key("Escape", "Escape", 27); await click(11.0); await key("1", "Digit1", 49);
  check("label: 1 drops a quick label behind the playhead", (await rows()).includes("um 0:10.65 0:11.10"));
  check("label: labels autosave", await ev(`JSON.parse(localStorage.getItem("speakeasy.label.demo.wav:12.00")).labels.length === 4`));
}
check("label: no script errors", errors.length === 0, errors.join(" | "));

close(); server.kill(); dev.kill();
await sleep(300);                  // Chrome may still hold its profile on Windows
console.log(failures() ? `\n${failures()} check(s) failed` : "\nsmoke ok");
process.exit(failures() ? 1 : 0);
