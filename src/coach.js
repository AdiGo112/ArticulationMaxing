/* coach.js — Optional Claude coaching. Off unless the user supplies a key.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { $ } from "./dom.js";
import { esc, words } from "./text.js";
import { analyseLanguage } from "./drills.js";
import { S } from "./run.js";

/* ══ AI COACH ═══════════════════════════════════════════════════
   Everything else in this app is local. This one feature is not: it sends
   the transcript to Anthropic, using a key the user supplies themselves.
   Off by default, one click, and it says exactly what it sends.

   The local metrics already cover delivery mechanics. What they cannot do
   is judge whether the answer was actually well made — structure, hedging,
   vagueness, whether you answered the question. That is what this asks. */

/* ══ ON-DEVICE MODEL ═════════════════════════════════════════════════
   Chrome ships a small language model that runs locally. No key, no request,
   nothing leaves the machine — which fits this app better than any API can.
   It is not always provisioned, so every call is feature-detected and any
   failure is reported rather than swallowed. */
const onDevice = {
  get supported(){ return typeof LanguageModel !== "undefined"; },
  state: null,
  /* availability() can hang on some machines, so it races a timeout — a probe
     that never settles must not leave the panel empty forever. */
  async check(){
    if(!this.supported) return (this.state = "unsupported");
    try{
      this.state = await Promise.race([
        LanguageModel.availability(),
        new Promise(r => setTimeout(() => r("unavailable"), 3000))
      ]);
    }catch(e){ this.state = "unavailable"; }
    return this.state;
  },
  async ask(system, prompt, onProgress){
    const opts = { initialPrompts: [{ role:"system", content: system }] };
    if(onProgress) opts.monitor = m =>
      m.addEventListener("downloadprogress", e => onProgress(Math.round((e.loaded||0)*100)));
    const session = await LanguageModel.create(opts);
    try{ return (await session.prompt(prompt)).trim(); }
    finally{ try{ session.destroy(); }catch(e){} }
  }
};

/* Small models do better with a narrow brief than a long one. */
const ONDEVICE_SYSTEM =
`You are a speaking coach. You are given a transcript of someone practising a spoken answer.
The transcript is from speech recognition: ignore punctuation, capitalisation and spelling entirely.
Judge only the content and structure of what they said.
Reply with exactly three short bullets, each starting with "- ", each under 25 words.
Bullet 1: what worked. Bullet 2: the single biggest weakness. Bullet 3: one concrete rewrite of their weakest sentence.
Be specific and quote their words. No preamble, no headings, no encouragement.`;

const AI_KEY = "speakeasy.anthropicKey";
const readKey  = () => { try{ return localStorage.getItem(AI_KEY) || ""; }catch(e){ return ""; } };
const writeKey = k => { try{ localStorage.setItem(AI_KEY, k); }catch(e){} };

const COACH_SYSTEM = `You are a speaking coach reviewing one transcript from a practice session. The speaker is working on articulation, clarity and confidence in spoken English.

Review CONTENT and STRUCTURE only. Delivery mechanics — pace, filler count, volume, pauses — are already measured locally and given to you as context. Do not re-report those numbers; reference them only when they explain something about the content.

The transcript comes from automatic speech recognition. Its punctuation is unreliable, it drops words, and it mangles names. Never comment on spelling, punctuation or capitalisation, and assume a broken-looking sentence is a transcription artefact unless the pattern repeats.

Reply in exactly these four sections, using these headings verbatim:

## Structure
Did the answer have a shape? If a framework was given, did they actually follow it? Two or three sentences.

## Language
Where was the wording vague, hedged, or repetitive? Quote their actual words. Two or three sentences.

## Rewrite
The whole answer as they could have said it. Same points, same opinion, their own examples — restructured and unhedged. Spoken English meant to be said out loud, not written prose. Keep it to roughly the number of words they actually spoke, so the two are comparable. Output the rewrite alone: no preamble, no commentary, no quotation marks.

## Next
One sentence naming the specific thing to practise next.

Be concrete and honest. Do not open with praise and do not flatter. If it was genuinely good, say so in one clause and move on. Keep Structure, Language and Next under 150 words combined; the rewrite is sized by what they said.`;

function coachPrompt(sess){
  const m = sess.m, r = sess.run || {};
  const facts = [
    `Drill: ${sess.name}`,
    r.question ? `Prompt they were answering: "${r.question}"` : null,
    r.framework ? `Framework given: ${r.framework}` : null,
    r.target ? `They were reading a set passage, so judge delivery of it, not their word choice. The words are the author's: omit the Rewrite section entirely.` : null,
    `Spoke for ${Math.round(sess.elapsed)}s at ${m.wpm ?? "unknown"} wpm.`,
    `Hard fillers: ${m.f.hard}. Crutch words: ${m.f.crutch}. Deliberate pauses: ${m.goodPauses}.`
  ].filter(Boolean).join("\n");
  return `${facts}\n\nTranscript:\n"""\n${sess.text || "(nothing was transcribed)"}\n"""`;
}

async function askCoach(sess){
  // pinned: an unversioned CDN import ships whatever was published last to every user
  const { default: Anthropic } = await import("https://esm.sh/@anthropic-ai/sdk@0.131.0");
  const client = new Anthropic({
    apiKey: readKey(),
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" }
  });
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: COACH_SYSTEM,
    messages: [{ role: "user", content: coachPrompt(sess) }]
  });
  if(res.stop_reason === "refusal")
    throw new Error("The model declined to review this transcript.");
  return res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

/* the reply is four fixed `## ` sections — render those, nothing more.
   Rewrite is the whole answer as it could have been said, so it gets the quote style. */
function renderCoach(md){
  return md.split(/^##\s+/m).filter(s => s.trim()).map(sec => {
    const nl = sec.indexOf("\n");
    const head = (nl < 0 ? sec : sec.slice(0, nl)).trim();
    const body = (nl < 0 ? "" : sec.slice(nl)).trim();
    const paras = body.split(/\n{2,}/).filter(Boolean).map(p => {
      const q = head === "Rewrite";
      return `<p class="${q ? "quote" : ""}">${esc(p.trim())}</p>`;
    }).join("");
    return `<h4>${esc(head)}</h4>${paras}`;
  }).join("");
}

/* The always-on tier: runs instantly, offline, in every browser, no model. */
export function renderLocalFindings(sess){
  const box = $("localFindings");
  const found = analyseLanguage(sess.text || "",
    { framework: sess.run && sess.run.framework, target: sess.run && sess.run.target });

  if(!(sess.text || "").trim()){
    box.innerHTML = `<p class="note">No transcript to read, so there is nothing to analyse.</p>`;
    return;
  }
  if(!found.length){
    box.innerHTML = `<p class="note"><b>Nothing weak enough to flag.</b> No hedging, padding or
      repetition worth mentioning in what you said. Read the transcript above and see whether it
      says what you meant it to.</p>`;
    return;
  }
  box.innerHTML = `<p class="eyebrow" style="margin-bottom:10px">Read on this device · ${found.length}
    ${found.length === 1 ? "habit" : "habits"} worth breaking</p>
    <ul class="notes">` +
    found.slice(0, 4).map(f => `<li><b>${esc(f.title)}.</b> ${esc(f.detail)}</li>`).join("") +
    `</ul>`;
}

/* Offer whichever deeper review this browser can actually do.
   Renders immediately from what is already known, then re-renders once the
   on-device probe answers — so a slow or hanging probe never leaves a blank. */
export function paintTiers(){
  drawTiers();
  if(onDevice.supported && onDevice.state === null)
    onDevice.check().then(() => { if($("aiBody")) drawTiers(); });
}

function drawTiers(){
  const box = $("aiBody"), state = onDevice.state;
  const local = state === "available" || state === "downloadable" || state === "downloading";
  const hasKey = !!readKey();

  const onDeviceBtn = !local ? "" :
    `<button class="btn ${hasKey ? "" : "primary"}" id="aiLocalGo">${
      state === "available" ? "Ask the on-device model" : "Download the on-device model"
    }</button>`;
  const apiBtn = hasKey
    ? `<button class="btn primary" id="aiGo">Ask Claude</button>
       <button class="btn" id="aiForget">Forget key</button>`
    : `<button class="btn" id="aiKeyBtn">Use Claude instead…</button>`;

  const blurb = local
    ? `Your browser has a language model built in. It runs <b>on this device</b> — no key, no account,
       and nothing sent anywhere.${state !== "available" ? " It needs a one-off download first." : ""}`
    : state === null && onDevice.supported
      ? `Checking whether this browser can run a model on-device…`
      : `This browser has no on-device model available. Claude gives a sharper read, but it does send
         your transcript — the only thing here that leaves your device.`;

  box.innerHTML = `
    <p class="note" style="margin:14px 0 12px">${blurb}</p>
    <div class="airow">${onDeviceBtn}${apiBtn}</div>`;

  if($("aiLocalGo")) $("aiLocalGo").onclick = runLocalModel;
  if($("aiGo")) $("aiGo").onclick = runCoach;
  if($("aiForget")) $("aiForget").onclick = () => { writeKey(""); paintTiers(); };
  if($("aiKeyBtn")) $("aiKeyBtn").onclick = () => paintAI("needkey");
}

async function runLocalModel(){
  const sess = S.lastSession;
  if(!sess || !sess.text || words(sess.text).length < 8)
    return paintAI("error", "There is no transcript to review.");
  paintAI("working", "Thinking on this device…");
  try{
    const reply = await onDevice.ask(ONDEVICE_SYSTEM, coachPrompt(sess),
      pct => paintAI("working", `Downloading the model… ${pct}%`));
    paintAI("done", reply, "on-device");
  }catch(e){
    paintAI("error", (e && e.message) || "The on-device model could not run.");
  }
}

function paintAI(state, payload, engine){
  const box = $("aiBody");
  if(state === "needkey"){
    box.innerHTML = `
      <p class="note" style="margin-bottom:12px">The scores above measure how you spoke. This asks Claude
        to judge <b>what you actually said</b> — structure, hedging, vagueness — which no amount of signal
        processing can do.</p>
      <div class="airow">
        <label class="sr" for="aiKey">Anthropic API key</label>
        <input id="aiKey" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false">
        <button class="btn" id="aiSave">Save key</button>
        <button class="btn" id="aiCancelKey">Cancel</button>
      </div>
      <p class="note"><b>This is the one thing here that leaves your device.</b> Your key is stored only in
        this browser, and the transcript is sent to Anthropic when you press the button — never automatically,
        and never your audio. Get a key at <a href="https://console.anthropic.com/settings/keys"
        target="_blank" rel="noopener">console.anthropic.com</a>.</p>`;
    $("aiSave").onclick = () => {
      const k = $("aiKey").value.trim();
      if(!k) return;
      writeKey(k); paintTiers();
    };
    $("aiKey").onkeydown = e => { if(e.key === "Enter") $("aiSave").click(); };
    $("aiCancelKey").onclick = () => paintTiers();
    return;
  }
  if(state === "working"){
    box.innerHTML = `<p class="working">${esc(payload || "Reading your transcript…")}</p>`;
    return;
  }
  if(state === "error"){
    box.innerHTML = `<div class="banner err"><b>Review failed.</b> ${esc(payload)}</div>
      <div class="airow"><button class="btn" id="aiBack">Back</button></div>`;
    $("aiBack").onclick = () => paintTiers();
    return;
  }
  box.innerHTML =
    `<p class="eyebrow" style="margin:14px 0 10px">${engine === "on-device"
      ? "Read by the model on this device" : "Read by Claude"}</p>` +
    renderCoach(payload) +
    `<div class="airow" style="margin-top:16px"><button class="btn" id="aiAgain">Ask again</button></div>`;
  $("aiAgain").onclick = () => paintTiers();
}

async function runCoach(){
  const sess = S.lastSession;
  if(!sess) return;
  if(!sess.text || words(sess.text).length < 8)
    return paintAI("error", "There is no transcript to review — nothing was picked up this session.");
  paintAI("working");
  try{ paintAI("done", await askCoach(sess)); }
  catch(e){
    const msg = /401|authentication/i.test(e.message) ? "That API key was rejected."
      : /rate|429/i.test(e.message) ? "Rate limited by the API. Wait a moment and try again."
      : /Failed to fetch|NetworkError|dynamically imported/i.test(e.message)
        ? "Could not reach the API. Check your connection — this feature needs network access."
        : e.message || "Unknown error.";
    paintAI("error", msg);
  }
}
