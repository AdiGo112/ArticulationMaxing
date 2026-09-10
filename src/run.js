/* run.js — Session runtime: arming, countdown, the frame loop, finishing a run.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { $ } from "./dom.js";
import { CRUTCH, HARD } from "./content.js";
import { store } from "./storage.js";
import { clamp, countFillers, esc, FILLER_RE, matchTarget, projFromRms, readStats, tokens, usedWord, variety, words } from "./text.js";
import { audio, makeVAD } from "./audio.js";
import { asrProblem, listener } from "./speech.js";
import { buildRun, drillById, markPlanDone } from "./drills.js";
import { band, scoreRun } from "./scoring.js";
import { css, drawRibbon } from "./canvas.js";
import { buildSetup, showReport } from "./report.js";
import { closeMenu } from "./ui.js";

/* ══ SESSION RUNTIME ══════════════════════════════════════════════ */

export const S = {
  drill:null, run:null, running:false, t0:0, elapsed:0, dur:0,
  tape:[], tapeV:[], marks:[], buf:[], bufV:[], lastSample:0, raf:0,
  vad:makeVAD(1), roomFrames:0, noiseFrames:0, wordTimes:[],
  voiced:false, silentSince:0, speakTime:0, lastFrame:0,
  levelSum:0, levelN:0, rmsSum:0, rmsN:0, goodPauses:0, longPause:0,
  flashUntil:0, lastFillers:0, wEls:[], coachAt:0, playhead:null, audioURL:null,
  /* Room calibration and the countdown run before the clock starts, so S.running
     is still false through all of it. Everything else guards on S.running, which
     left the whole prep phase wide open. */
  arming:false, cdIv:null, cdDone:null, cdToken:0
};

/* The countdown is a modal, so nothing behind it should be reachable. aria-modal
   is only a hint to screen readers — it doesn't stop a tab key or a click, which
   is how Exit got pressed underneath and stranded the countdown over the home
   screen. inert is the attribute that actually does it. */
function cdShow(){
  $("countdown").classList.add("on");
  [...document.body.children].forEach(el =>
    el.id !== "countdown" && el.toggleAttribute("inert", true));
}
function cdHide(){
  $("countdown").classList.remove("on");
  [...document.body.children].forEach(el => el.removeAttribute("inert"));
}

/* Abandon a run that hasn't started yet: stop the timers, drop the overlay, and
   release whoever is awaiting the countdown so begin() can bail before start(). */
export function armCancel(){
  if(!S.arming) return;
  S.arming = false;
  S.cdToken++;                       // orphan any timer or speech callback still pending
  clearInterval(S.cdIv); S.cdIv = null;
  try{ speechSynthesis.cancel(); }catch(e){}
  cdHide();
  const done = S.cdDone; S.cdDone = null;
  done && done();
}

/* A report can keep playing after its view is hidden, so every view change
   explicitly stops it rather than relying on the browser to pause hidden media. */
function stopPlayback(){
  const playback = $("playback");
  if(!playback) return;
  playback.pause();
  playback.currentTime = 0;
}

export function view(name){
  stopPlayback();
  ["practice","progress","guide","booth","report"].forEach(v=>$("v-"+v).classList.toggle("on", v===name));
  const isHome = name === "practice";
  document.querySelector(".layout").classList.toggle("is-home", isHome);
  document.querySelectorAll("[data-nav]").forEach(link => {
    const current = link.dataset.nav === name;
    link.toggleAttribute("aria-current", current);
    if(current) link.setAttribute("aria-current", "page");
  });
  if(matchMedia("(max-width: 940px)").matches) closeMenu();
  window.scrollTo({top:0, behavior:"instant"});
}

export function newRun(id){
  S.drill = drillById(id);
  S.run = buildRun(id);
  S.dur = S.run.dur;
  $("boothName").textContent = S.drill.name;
  $("promptBox").innerHTML = S.run.html;
  S.wEls = [...$("promptBox").querySelectorAll("w")];
  S.wEls.forEach(el => el._n = words(el.textContent)[0] || "");
  $("liveText").innerHTML = "";
  $("clock").textContent = fmt(S.dur);
  $("clock").classList.remove("warn");
  $("setupRow").style.display = "";
  $("goBtn").textContent = id==="echo" ? "Listen, then speak" : "Start speaking";
  $("goBtn").className = "btn primary";
  $("coach").className = "";
  $("coach").innerHTML = `<b>${esc(S.drill.hint)}</b>`;
  $("ribbonHint").style.display = "";
  ["pace","fill","proj","extra"].forEach(k=>{
    $("b-"+k).style.width = "0%"; $("m-"+k).className = "mtr";
  });
  $("v-pace").innerHTML = "—<small>wpm</small>"; $("v-fill").textContent = "0";
  $("v-proj").textContent = "—"; $("v-extra").textContent = "0";
  $("l-extra").textContent = id==="pace"||id==="diction"||id==="echo" ? "Accuracy" : "Pauses";
  S.tape=[]; S.tapeV=[]; S.marks=[]; S.buf=[]; S.bufV=[]; S.playhead=null;
  S.roomFrames=0; S.noiseFrames=0; S.wordTimes=[];
  buildSetup();
  updateAsrChip();
  // say up front if word-level feedback won't be available this session
  $("boothBanner").innerHTML = listener.supported ? "" : (p => `<div class="banner"><b>${esc(p.t)}.</b> ${esc(p.d)}</div>`)(asrProblem(null));
}

export const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0");

export async function begin(){
  if(S.running || S.arming) return;   // a second Space used to start a run on top of the first
  S.arming = true;
  $("boothBanner").innerHTML = "";
  try{ await audio.open(); }
  catch(e){
    $("boothBanner").innerHTML =
      `<div class="banner err"><b>No microphone.</b> Speakeasy needs mic access to give you feedback.
       Allow it in the address bar and press Start again. If you opened this file directly, serve it over
       http instead — browsers block microphones on <code>file://</code> in most cases.</div>`;
    S.arming = false;
    return;
  }
  await calibrateRoom();
  if(!S.arming) return;              // cancelled while the room was being measured
  await countdown();
  if(!S.arming) return;              // cancelled mid-countdown
  S.arming = false;
  start();
}

/* Measure the room before every run. This is the whole trick: the speech gate
   is set relative to what silence actually sounds like here, today, on this
   mic — not to a constant that is wrong in most rooms. */
function calibrateRoom(){
  return new Promise(res=>{
    S.cdDone = res;
    cdShow();
    $("cd-n").textContent = "···";
    $("cd-t").textContent = "Listening to your room";
    $("cd-p").textContent = "Stay quiet for a second — this is how it learns to tell you apart from the background.";
    S.vad.calib = [];
    const iv = setInterval(()=> S.vad.sample(audio.probe().rms), 40);
    setTimeout(()=>{ clearInterval(iv); if(!S.arming) return; S.vad.commit(); updateRoomChip(); res(); }, 1100);
  });
}

/* Make transcription's state visible instead of leaving an empty space where
   words should be. Silence used to be indistinguishable from failure. */
function updateAsrChip(){
  const chip = $("asrChip");
  let label, bad = false;
  if(!listener.supported){ label = "off"; bad = true; }
  else if(listener.err && !listener.want){ label = "failed"; bad = true; }
  else if(!S.running) label = "ready";
  else if(listener.gotAny) label = "on";
  else label = "listening…";
  chip.innerHTML = `Transcript <b>${label}</b>`;
  chip.style.borderColor = bad ? css("--live") : "";

  const box = $("liveText");
  if(!S.running || listener.gotAny) return;
  // running with nothing yet: say so rather than showing a blank
  box.innerHTML = `<span class="waiting">${
    !listener.supported ? "No transcription in this browser — the recording and meters still work."
    : listener.err && !listener.want ? esc(asrProblem(listener.err).t) + " — see the notice above."
    : "Listening… your words will appear here as you speak."}</span>`;
}

function updateRoomChip(){
  const r = S.vad.roomLevel(), chip = $("roomChip");
  const noisy = r >= 34;
  chip.innerHTML = `Room <b>${r < 12 ? "quiet" : r < 34 ? "ok" : "noisy"}</b>`;
  chip.style.borderColor = noisy ? css("--live") : "";
  chip.title = `Background noise measured at ${r}/100. The speech gate is set from this.`;
  $("boothBanner").innerHTML = noisy
    ? `<div class="banner"><b>Your room is noisy.</b> The gate is set above the background, so quiet
       speech may not register. Move somewhere quieter, get closer to the mic, or set sensitivity to
       <b>Quiet voice</b> below.</div>` : "";
}

function countdown(){
  return new Promise(res=>{
    let n = S.drill.prep;
    S.cdDone = res;                    // the Echo branch resolves without ever setting an interval
    /* Echo speaks its line and finishes on a speech callback, with a timeout as
       a backstop. Cancel mid-sentence and both are still queued — without this
       they land inside the *next* run and tear down a countdown that just began. */
    const tok = ++S.cdToken, live = () => tok === S.cdToken;
    $("cd-p").textContent = S.run.cd || "";
    cdShow();
    if(S.run.speak && window.speechSynthesis){
      $("cd-t").textContent = "Listen";
      const u = new SpeechSynthesisUtterance(S.run.speak);
      u.rate = .92; u.pitch = 1;
      const v = speechSynthesis.getVoices().find(v=>/en-GB|en-US/.test(v.lang) && !/google/i.test(v.name));
      if(v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      u.onend = () => { if(!live()) return; $("cd-n").textContent = "Go"; setTimeout(done, 550); };
      setTimeout(done, 9000);
      $("cd-n").textContent = "♪";
      return;
    }
    $("cd-t").textContent = n>6 ? "Think. Pick your last sentence." : "Get ready";
    $("cd-n").textContent = n;
    S.cdIv = setInterval(()=>{
      n--;
      if(n<=0){ done(); return; }
      $("cd-n").textContent = n;
      if(n<=3) $("cd-t").textContent = "Breathe out";
    }, 1000);
    function done(){
      if(!live()) return;
      S.cdToken++; clearInterval(S.cdIv); S.cdIv = null; cdHide(); res();
    }
  });
}

function start(){
  S.running = true; S.t0 = performance.now(); S.lastFrame = S.t0; S.lastSample = 0;
  S.speakTime = 0; S.levelSum = 0; S.levelN = 0; S.rmsSum = 0; S.rmsN = 0;
  S.goodPauses = 0; S.longPause = 0;
  S.roomFrames = 0; S.noiseFrames = 0; S.wordTimes = [];
  S.voiced = false; S.silentSince = S.t0; S.lastFillers = 0; S.coachAt = 0;
  document.body.classList.add("live");
  $("ribbonHint").style.display = "none";
  $("setupRow").style.display = "none";        // length is locked once the clock starts
  $("goBtn").textContent = "Stop"; $("goBtn").className = "btn rec";
  $("skipBtn").disabled = true;
  $("coach").innerHTML = "<b>Go.</b>";
  audio.startRecording();
  if(listener.supported){
    listener.onUpdate = onTranscript;
    listener.onStatus = updateAsrChip;
    listener.onError = code => {
      const p = asrProblem(code);
      $("boothBanner").innerHTML = `<div class="banner err"><b>${esc(p.t)}.</b> ${esc(p.d)}
        The timer, level meter and recording keep working without it.</div>`;
      updateAsrChip();
    };
    listener.start();
  }
  updateAsrChip();
  loop();
}

function loop(){
  if(!S.running) return;
  S.raf = requestAnimationFrame(loop);
  const now = performance.now(), dt = (now - S.lastFrame)/1000; S.lastFrame = now;
  S.elapsed = (now - S.t0)/1000;

  const p = audio.probe();
  const on = S.vad.step(p.rms, p.ratio, now);
  S.noiseFrames++; if(!on && p.rms > S.vad.floor*1.6) S.roomFrames++;

  S.buf.push(p.level); S.bufV.push(on ? 1 : 0);
  if(S.buf.length > 1200){ S.buf.shift(); S.bufV.shift(); }
  // the lamp answers your voice, not the room
  document.documentElement.style.setProperty("--glow", (p.level * (on ? 0.9 : 0.12)).toFixed(3));

  if(now - S.lastSample > 50){                                          // 20 Hz
    S.lastSample = now; S.tape.push(p.level); S.tapeV.push(on ? 1 : 0);
  }

  if(on){
    S.speakTime += dt; S.levelSum += p.level; S.levelN++;
    S.rmsSum += p.rms; S.rmsN++;                    // projection measures you, not the room
    if(!S.voiced){
      // measure the gap between real voice, not between hangover edges
      const gap = (S.vad.aboveSince - S.silentSince)/1000;
      if(gap > 0.35 && S.silentSince > S.t0 + 500){
        S.longPause = Math.max(S.longPause, gap);
        if(gap >= 0.4 && gap <= 2.2){ S.goodPauses++; S.marks.push({t:S.elapsed, type:"pause"}); }
      }
      S.voiced = true;
    }
  }else if(S.voiced){ S.voiced = false; S.silentSince = S.vad.lastVoiced; }

  drawRibbon(S.buf, S.bufV, S.flashUntil);
  tick();

  if(S.dur && S.elapsed >= S.dur) finish();
}

function tick(){
  const left = S.dur ? Math.max(0, S.dur - S.elapsed) : S.elapsed;
  $("clock").textContent = fmt(left);
  $("clock").classList.toggle("warn", !!S.dur && left <= 10);

  const proj = S.rmsN ? projFromRms(S.rmsSum/S.rmsN) : 0;
  set("proj", proj, proj, proj>=50&&proj<=82 ? "good" : proj<50 ? "warn" : "hot");

  if(S.run.framework && S.dur){
    let acc = 0, p = S.elapsed/S.dur, at = -1;
    S.run.framework.steps.forEach((s,i)=>{ if(p>=acc) at=i; acc+=s.w; });
    [...$("promptBox").querySelectorAll(".step")].forEach((el,i)=>{
      el.classList.toggle("now", i===at); el.classList.toggle("done", i<at);
    });
  }
  if(!S.run.target){
    set("extra", S.goodPauses, Math.min(100, S.goodPauses*12), S.goodPauses>=3?"good":"");
  }

  const now = performance.now();
  if(now - S.coachAt > 3400){ S.coachAt = now; liveCoach(); }
}

function set(k, val, pct, cls){
  const v = $("v-"+k);
  if(k==="pace") v.innerHTML = (val||"—") + "<small>wpm</small>";
  else v.textContent = val;
  $("b-"+k).style.width = clamp(pct,0,100) + "%";
  $("m-"+k).className = "mtr" + (cls ? " "+cls : "");
}

function onTranscript(final, interim){
  const all = (final + " " + interim).trim();
  const f = countFillers(all);
  const w = words(all).length;

  /* Stamp each new word with the moment it appeared, so playback can follow
     the text later. Recognition streams interim results word by word, so this
     tracks speech closely; it only ever grows, because Chrome revises interim
     text and a shrinking count must not rewrite times already recorded. */
  const seen = tokens(all).length;
  while(S.wordTimes.length < seen) S.wordTimes.push(S.elapsed);
  // hold the pace readout until there’s enough speech for it to mean anything,
  // otherwise the first three words read as 600 wpm
  const wpm = (w >= 8 && S.elapsed > 5) ? Math.round(w/(S.elapsed/60)) : 0;

  set("pace", wpm||"", wpm ? clamp((wpm/220)*100,0,100) : 0,
      !wpm ? "" : wpm>=125&&wpm<=175 ? "good" : (wpm>190||wpm<105) ? "hot" : "warn");
  set("fill", f.total, Math.min(100, f.total*9),
      f.hard>0 ? "hot" : f.total>3 ? "warn" : f.total===0 ? "good" : "");

  if(f.total > S.lastFillers){
    S.lastFillers = f.total;
    S.flashUntil = performance.now() + 420;
    S.marks.push({t:S.elapsed, type:"filler"});
    $("coach").classList.add("flash");
    setTimeout(()=>$("coach").classList.remove("flash"), 420);
  }

  const lt = $("liveText");
  lt.innerHTML = paint(final) + `<span class="interim">${esc(interim)}</span>`;
  lt.scrollTop = lt.scrollHeight;

  if(S.wEls.length){
    const acc = markTargets(all);
    if(S.run.target) set("extra", acc + "%", acc, acc>=85?"good":acc>=65?"warn":"hot");
  }
}

/* Highlighting uses the same matcher countFillers() counts with — they used to
   be two separate regexes built two different ways, so the transcript could mark
   "and stuff" once while the meter beside it charged you twice. */
export function paint(text){
  return esc(text).replace(FILLER_RE, m =>
    `<span class="${HARD.includes(m.toLowerCase().replace(/\s+/g," ")) ? "f" : "c"}">${m}</span>`);
}

/* progressive alignment of what you said against the target text */
function markTargets(spoken){
  const hit = matchTarget(spoken, S.run.target || "");
  let hits = 0;
  S.wEls.forEach((el,i) => { el.className = hit[i] ? "hit" : ""; if(hit[i]) hits++; });
  return S.wEls.length ? Math.round(100*hits/S.wEls.length) : 0;
}

function liveCoach(){
  const c = $("coach");
  if(!listener.supported){
    c.innerHTML = `<b>Keep going.</b> Live transcription isn’t available in this browser, so watch the level meter and the clock — the recording is still being made.`;
    return;
  }
  const t = listener.text(), f = countFillers(t), w = words(t).length;
  const wpm = w ? Math.round(w/(Math.max(S.elapsed,3)/60)) : 0;
  let msg;
  if(w < 4) msg = "<b>Start talking.</b> First sentence out loud, even if it’s rough.";
  else if(f.hard >= 2) msg = "<b>Close your mouth instead.</b> A pause costs you nothing. An <i>um</i> costs you authority.";
  else if(wpm > 185) msg = "<b>Slow down.</b> You’re ahead of the room. Full stop, breath, continue.";
  else if(wpm && wpm < 105) msg = "<b>Commit to the sentence.</b> Decide where it ends, then say the whole thing.";
  else if(f.crutch >= 4) msg = "<b>Drop the padding.</b> <i>Like, basically, actually</i> — the sentence works without them.";
  else if(S.run.framework) msg = "<b>Stay on the highlighted step.</b> Finish it before you move on.";
  else msg = "<b>Good.</b> Hold this pace and keep the pauses deliberate.";
  c.innerHTML = msg;
}

export async function finish(){
  if(!S.running) return;
  S.running = false;
  cancelAnimationFrame(S.raf);
  document.body.classList.remove("live");
  document.documentElement.style.setProperty("--glow", 0);
  listener.stop();
  $("skipBtn").disabled = false;
  const url = await audio.stopRecording();
  S.audioURL = url;

  const text = listener.text();
  const f = countFillers(text);
  const wCount = words(text).length;
  const mins = Math.max(S.elapsed, 1)/60;
  const longEnough = S.elapsed >= 5 && wCount >= 8;   // below this, wpm is noise

  const m = {
    wpm: listener.supported && longEnough ? Math.round(wCount/mins) : null,
    artic: S.speakTime>3 && longEnough ? Math.round(wCount/(S.speakTime/60)) : null,
    f, words:wCount,
    proj: S.rmsN ? projFromRms(S.rmsSum/S.rmsN) : 0,
    // how far your voice sits above the room, in dB — the other half of projection
    // floor the numerator the way projFromRms does: a run that recorded frames
    // but no signal at all gave log10(0), and "-Infinity dB above the room"
    // went straight into the report row and the coaching note
    snr: S.rmsN ? Math.round(20*Math.log10(Math.max(S.rmsSum/S.rmsN,1e-5)/Math.max(S.vad.floor,1e-5))) : null,
    acc: null, coverage: null,
    var: listener.supported ? variety(text) : null,
    goodPauses: S.goodPauses,
    longPause: S.longPause,
    pauseScore: null,
    usedWord: S.run.requireWord ? usedWord(text, S.run.requireWord) : null,
    quiet: S.elapsed>0 ? Math.round(100*(1 - S.speakTime/S.elapsed)) : 0,
    room: S.vad.roomLevel()
  };
  const ppm = S.goodPauses/Math.max(mins,.2);
  m.pauseScore = Math.round(band(ppm, 5, 10, 11));   // 5–10 deliberate pauses a minute
  if(S.run.target && listener.supported){
    const st = readStats(text, S.run.target);
    m.acc = st.acc;                 // diction over the words you reached
    m.coverage = st.coverage;       // how much of the passage you got through
  }
  if(m.usedWord === true)  m.acc = 100;                       // used it in a real sentence
  if(m.usedWord === false) m.acc = Math.min(m.acc ?? 100, 40); // the whole point of the drill

  const {score, parts} = scoreRun(m, S.run, S.drill.id);
  const sess = {
    at: Date.now(), drill: S.drill.id, name: S.drill.name, score,
    elapsed: S.elapsed, tape: S.tape, tapeV: S.tapeV, marks: S.marks, text, m, parts, playhead:null,
    wordTimes: S.wordTimes.slice(),
    // what the drill actually asked, so the coach can judge whether they answered it
    run: { question: S.run.cd || null, target: S.run.target || null,
           display: S.run.display || null,
           framework: S.run.framework ? S.run.framework.name : null }
  };
  // keep the component scores, not just the total: the plan picks your weakest
  // metric from these, and Progress trends each one separately
  store.add({ at:sess.at, drill:sess.drill, name:sess.name, score, wpm:m.wpm, fillers:f.total,
    parts: Object.fromEntries(parts.map(p => [p.k, p.v])) });
  markPlanDone(sess.drill);
  showReport(sess);
}
