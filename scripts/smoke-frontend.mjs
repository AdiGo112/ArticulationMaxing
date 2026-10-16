/* smoke-frontend.mjs — The React port in headless Chrome, with Chrome's fake
   microphone (a test tone), so a run goes all the way through: room check,
   countdown, the frame loop, MediaRecorder, scoring, the report, and the save
   to IndexedDB. Also: the one-time move of the old app's history, the goal
   pack, the live logo, the phone layout, and the label page (a dev page, served
   by the Vite dev server since it is never built). Run after a build:
   cd frontend && npm run build && node ../scripts/smoke-frontend.mjs      */

import { spawn } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, failures, launch, sleep } from "./cdp.mjs";

const dir = join(import.meta.dirname, "..", "frontend");
const PORT = 4173, origin = `http://localhost:${PORT}`;
const server = spawn(process.execPath, [join(dir, "node_modules/vite/bin/vite.js"), "preview", "--port", PORT, "--strictPort"], { cwd: dir });
const DEV = 5199, devOrigin = `http://localhost:${DEV}`;
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

const { ev, until, errors, open, close, send, on, profile } = await launch([
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]);
const text = () => ev(`document.body.innerText`);
const reels = () => ev(`document.querySelectorAll("svg[aria-label^='Reel']").length`);   // DESIGN.md: one per screen
const press = label => ev(`[...document.querySelectorAll("button, a")].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.click() ?? "missing"`);
const stored = () => ev(`new Promise(res => { const r = indexedDB.open("speakeasy"); r.onsuccess = () =>
  { const g = r.result.transaction("kv").objectStore("kv").get("record"); g.onsuccess = () => { res(g.result ? g.result.sessions.length : -1); r.result.close(); }; };
  r.onerror = () => res(-2); })`);

console.log(`Speakeasy React port smoke test — ${origin}`);

/* Headless Chrome has no speech recogniser. A stand-in "hears" one fixed sentence
   shortly after it starts, so a run has a transcript: fillers get marked and the
   coach has something to read. Installed before the app loads. */
const HEARD = "so um I wake up at seven and like the kettle goes on first every single morning";
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  class FakeRecogniser {
    start() { setTimeout(() => this.onstart && this.onstart(), 10);
      if (window.__asrFail) { this.t = setTimeout(() => this.onerror && this.onerror({ error: window.__asrFail }), 60); return; }
      this.t = setTimeout(() => this.onresult && this.onresult({ resultIndex: 0,
        results: { length: 1, 0: { isFinal: true, 0: { transcript: ${JSON.stringify(HEARD)} } } } }), 600); }
    stop() { clearTimeout(this.t); setTimeout(() => this.onend && this.onend(), 10); }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = FakeRecogniser;` });

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
await open(origin + "/#/drill/filler");
check("booth: ready to start", await until(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("START SPEAKING"))`), await text());
await press("▶ START SPEAKING");
check("run: room check, then countdown", await until(`!!document.querySelector("[role=dialog]")`, 3000), await text());
check("countdown: one Reel", (await reels()) === 1, "found " + (await reels()));
check("run: starts after the countdown", await until(`[...document.querySelectorAll("button")].some(b => b.textContent.includes("STOP"))`, 8000), await text());
check("run: the logo goes live", await ev(`!!document.querySelector(".onair.live")`));
check("run: REC shows the clock", await until(`/REC \\d+:\\d\\d/.test(document.body.innerText)`, 3000));
await sleep(2500);
await press("■ STOP");
check("run: ends on the report with a score", await until(`location.hash === "#/report" && !!document.querySelector("[aria-label^='Score ']")`, 6000), await text());
check("report: the heard 'um' is marked as a hard filler", await ev(`[...document.querySelectorAll("mark.hard")].some(m => m.textContent === "um")`));
check("coach: on the report", await ev(`!!document.querySelector("[aria-label=Coach]")`));
check("coach: the SDK is its own chunk", readdirSync(join(dir, "dist/assets")).some(f => f.startsWith("sdk-")));
check("coach: the SDK isn't downloaded until someone asks", await ev(`!performance.getEntriesByType("resource").some(e => e.name.includes("/sdk-"))`));
await press("Use Claude…");
check("coach: the key form says what leaves the device", await until(`!!document.querySelector("input[type=password]") && document.body.innerText.includes("the one thing here that leaves your device")`), await text());
/* Claude review, end to end in the page, with the API call answered by Chrome
   (Fetch interception): the lazy SDK loads, sends, and the reply renders. No key, no cost. */
const REPLY = { id: "msg_smoke", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
  content: [{ type: "text", text: "## Structure\nIt had a shape.\n\n## Language\nOne um at the start.\n\n## Rewrite\nI wake at seven; the kettle goes on first.\n\n## Next\nOpen without the um." }] };
const CORS = [{ name: "access-control-allow-origin", value: "*" }, { name: "access-control-allow-headers", value: "*" }, { name: "access-control-allow-methods", value: "POST, OPTIONS" }];
let asked = null;
on("Fetch.requestPaused", p => {
  if (!p.request.url.startsWith("https://api.anthropic.com")) return;
  if (p.request.method === "OPTIONS") return send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: 204, responseHeaders: CORS });
  asked = JSON.parse(p.request.postData || "{}");
  send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: 200, responseHeaders: [...CORS, { name: "content-type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(REPLY)).toString("base64") });
});
await send("Fetch.enable", { patterns: [{ urlPattern: "https://api.anthropic.com/*" }] });
await ev(`(() => { const i = document.querySelector("input[type=password]"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  set.call(i, "sk-ant-smoke"); i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
await press("Save key");
await press("Review with Claude");
check("coach: Claude's review renders as sections", await until(`["Structure", "Language", "Rewrite", "Next"].every(h => [...document.querySelectorAll("[aria-label=Coach] h3")].some(e => e.textContent === h))`, 8000), await text());
check("coach: it asked Opus 5.5 with the transcript wrapped as data", !!asked && asked.model === "claude-opus-5-5"
  && /<transcript>[\s\S]*um[\s\S]*<\/transcript>/.test(String(asked.messages?.[0]?.content || "")), JSON.stringify(asked)?.slice(0, 300));
check("coach: the SDK loaded only now", await ev(`performance.getEntriesByType("resource").some(e => e.name.includes("/sdk-"))`));
await send("Fetch.disable");
await ev(`localStorage.removeItem("speakeasy.anthropicKey"), true`);
check("nav: the report sits under DRILLS, on its own drill", await ev(`document.querySelector(".side a[aria-current]")?.textContent.includes("DRILLS")
  && document.querySelector(".side .sub a[aria-current=page]")?.getAttribute("href") === "#/drill/filler" && document.querySelectorAll(".side .sub a").length === 7`));
check("report: one Reel", (await reels()) === 1, "found " + (await reels()));
check("run: saved to IndexedDB", (await stored()) === 2);
check("run: the recording can play", await until(`!!document.querySelector("audio[src^='blob:']")`, 3000));
check("run: no script errors", errors.length === 0, errors.join(" | "));

await press("↻ same prompt again");
check("again: back in the booth for the same drill", await until(`location.hash === "#/drill/filler" && document.body.innerText.includes("START SPEAKING")`));

/* a recogniser that fails says why while the run carries on */
await ev(`window.__asrFail = "network", true`);
await press("▶ START SPEAKING");
check("booth: a failing recogniser is explained while running", await until(`document.body.innerText.includes("Transcription can't reach its service") && document.body.innerText.includes("STOP")`, 12000), await text());
await ev(`window.__asrFail = null, dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })), true`);
check("booth: Esc leaves the failed run", await until(`document.body.innerText.includes("START SPEAKING")`));

/* every nav item lands on a real page, each with one Reel */
for (const [page, h1] of [["drills", "Pick the one"], ["progress", "What's actually changed"], ["texts", "Rehearse the talk"], ["guide", "How to actually get better"], ["data", "Your data"], ["interview", "A mock interview"]]) {
  await open(origin + "/#/" + page);
  check(`${page}: renders`, await until(`document.querySelector("h1")?.textContent.startsWith(${JSON.stringify(h1)}) && !document.body.innerText.includes("is next.")`), await text());
  check(`${page}: one Reel`, (await reels()) === 1, "found " + (await reels()));
}
await open(origin + "/#/drills");
check("drills: six cards, each opens its booth", await until(`document.querySelectorAll("main a[href^='#/drill/']").length === 6`));
await open(origin + "/#/progress");
check("progress: counts both sessions and lists the run", await until(`document.body.innerText.includes("Filler Hunt") && [...document.querySelectorAll("b.big")].some(b => b.textContent === "2")`), await text());

/* your texts: breath marks and crutch words in the preview, saved, rehearsed in the booth */
await open(origin + "/#/texts");
const typeInto = (sel, value) => ev(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); const proto = i.tagName === "TEXTAREA" ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
await typeInto("input[type=text]", "Best man speech");
await typeInto("textarea", "Good evening, everyone. For those who don't know me, I'm Sam, and I've known Arjun since we were eleven and basically terrible at football.");
check("texts: preview places breath marks and flags crutch words", await until(`document.querySelectorAll("[aria-label='pause here']").length >= 2 && document.body.innerText.includes("1 crutch word")`), await text());
await press("save");
await press("▶ REHEARSE THIS");
check("texts: rehearsing opens the booth on your text", await until(`location.hash === "#/drill/pace" && document.body.innerText.includes("known Arjun since")`), await text());
check("texts: the text is kept in IndexedDB", await ev(`new Promise(res => { const r = indexedDB.open("speakeasy"); r.onsuccess = () =>
  { const g = r.result.transaction("kv").objectStore("kv").get("record"); g.onsuccess = () => { res(g.result.texts?.[0]?.title === "Best man speech"); r.result.close(); }; }; })`));

/* your data: download, restore through the file input, then start over */
await send("Browser.setDownloadBehavior", { behavior: "deny" });
await open(origin + "/#/data");
await press("↓ DOWNLOAD A BACKUP");
check("data: download reports what it saved", await until(`document.body.innerText.includes("Saved 2 sessions") && /last backup: today/i.test(document.body.innerText)`), await text());
const backupFile = join(profile, "backup.json");
writeFileSync(backupFile, JSON.stringify({ kind: "speakeasy-backup", version: 1, sessions: [
  { at: Date.UTC(2026, 8, 1), drill: "echo", name: "Echo", score: 77, wpm: null, fillers: 0 }, { at: "broken" }],
  texts: [{ id: "q3", title: "Q3 update", text: "Revenue is up.", at: Date.UTC(2026, 8, 1) }] }));
const { root } = (await send("DOM.getDocument")).result;
const { nodeId } = (await send("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" })).result;
await send("DOM.setFileInputFiles", { nodeId, files: [backupFile] });
check("data: restore merges and says what it skipped", await until(`document.body.innerText.includes("Restored 1 new session") && document.body.innerText.includes("1 damaged entry was skipped")`), await text());
check("data: restored session is stored", (await stored()) === 3);
await ev(`window.confirm = () => true`);
await press("DELETE EVERYTHING");
check("data: start over empties the record", await until(`document.body.innerText.includes("Everything is gone")`) && (await stored()) === 0);

/* the waitlist posts to Netlify Forms (answered here by Chrome) */
let posted = null;
on("Fetch.requestPaused", p => {
  if (!p.request.url.startsWith(origin)) return;
  if (p.request.method !== "POST") return send("Fetch.continueRequest", { requestId: p.requestId });
  posted = p.request.postData;
  send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: 200, body: "" });
});
await open(origin + "/#/guide");
await send("Fetch.enable", { patterns: [{ urlPattern: origin + "/" }] });
await typeInto("textarea[name=use]", "a job interview");
await press("Send");
check("guide: waitlist sends to Netlify Forms", await until(`document.body.innerText.includes("Thanks — got it.")`) && /form-name=waitlist/.test(posted) && /use=a\+job\+interview/.test(posted), posted);
await send("Fetch.disable");
check("pages: no script errors", errors.length === 0, errors.join(" | "));

/* phone: the side nav becomes a tab bar. Widths are checked against 390, not innerWidth:
   mobile emulation widens the layout viewport to fit content that overflows. */
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await open(origin + "/#/");
check("phone: tab bar shown, side nav hidden", await until(`getComputedStyle(document.querySelector(".tabs")).display === "grid" && getComputedStyle(document.querySelector(".side")).display === "none"`));
check("phone: home fits the width", await ev(`document.documentElement.scrollWidth <= 391`), await ev(`document.documentElement.scrollWidth + " px wide on a 390 px phone"`));
await open(origin + "/#/data");
check("phone: More leads to the interview and the guide", await until(`getComputedStyle(document.querySelector(".subnav")).display === "flex" && !!document.querySelector(".subnav a[href='#/guide']") && !!document.querySelector(".subnav a[href='#/interview']")`));
for (const page of ["drills", "progress", "texts", "guide", "data", "interview"]) {
  await open(origin + "/#/" + page);
  check(`phone: ${page} fits the width`, await until(`!!document.querySelector("h1") && document.documentElement.scrollWidth <= 391`), await ev(`document.documentElement.scrollWidth + " px wide on a 390 px phone"`));
}
await open(origin + "/#/report");
check("phone: the report fits the width", await until(`!!document.querySelector("[aria-label^='Score ']") && document.documentElement.scrollWidth <= 391`), await ev(`document.documentElement.scrollWidth + " px wide on a 390 px phone: " + document.body.innerText.slice(0, 300)`));

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
