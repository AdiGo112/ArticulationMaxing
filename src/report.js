/* report.js — The post-run report, shared UI primitives, and the follow-along transcript.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { $ } from "./dom.js";
import { CRUTCH, HARD } from "./content.js";
import { READ_LAG, esc, norm, readStats, tokens, wordAt } from "./text.js";
import { asrProblem, listener } from "./speech.js";
import { drillById, nextInPlan, readPlan } from "./drills.js";
import { coachNotes, verdict } from "./scoring.js";
import { css, drawTape } from "./canvas.js";
import { S, fmt, paint, view } from "./run.js";
import { paintTiers, renderLocalFindings } from "./coach.js";

/* ══ REPORT ══════════════════════════════════════════════════════ */

export function showReport(sess){
  view("report");
  S.lastSession = sess;                       // kept so a theme switch can repaint the tape
  const m = sess.m, [title, sub] = verdict(sess.score);
  $("r-score").style.color = scoreColor(sess.score);
  countTo($("r-score"), sess.score);
  $("r-kicker").textContent = sess.name + " · " + fmt(sess.elapsed);
  $("r-title").textContent = title;
  $("r-sub").textContent = sub;
  $("tapeLen").textContent = fmt(sess.elapsed) + " of tape";
  drawRings(sess.parts);
  $("r-title").focus();                       // move focus so the result is announced

  requestAnimationFrame(()=>drawTape(sess));
  const cv = $("tape");
  cv.onclick = e => {
    const r = cv.getBoundingClientRect();
    const t = ((e.clientX - r.left)/r.width) * sess.elapsed;
    const a = $("playback");
    if(a.src){ a.currentTime = t; a.play(); }
    sess.playhead = t; drawTape(sess);
  };
  const a = $("playback");
  if(S.audioURL){
    a.src = S.audioURL; a.style.display = "";
    const follow = () => { sess.playhead = a.currentTime; drawTape(sess); syncSaid(a.currentTime); };
    a.ontimeupdate = follow;
    a.onseeked = follow;                      // jumping on the tape moves the text too
    // only dim the unread trail while it is actually running
    a.onplay  = () => $("saidWrap").classList.add("playing");
    a.onpause = () => $("saidWrap").classList.remove("playing");
    a.onended = () => $("saidWrap").classList.remove("playing");
  } else { a.style.display = "none"; }

  const row = (k,v,cls) => `<div class="row"><span>${k}</span><b class="${cls||""}">${v}</b></div>`;
  const g = (v,lo,hi) => v==null ? "" : (v>=lo&&v<=hi ? "g" : "w");
  $("r-rows").innerHTML = [
    m.wpm!=null ? row("Pace", m.wpm+" wpm", g(m.wpm,125,175)) : row("Pace","not measured",""),
    m.artic!=null ? row("Rate while speaking", m.artic+" wpm","") : "",
    row("Hard fillers", m.f.hard, m.f.hard===0?"g":"r"),
    row("Crutch words", m.f.crutch, m.f.crutch<=3?"g":"w"),
    row("Projection", m.proj, g(m.proj,50,82)),
    m.snr!=null ? row("Voice above room", m.snr + " dB", m.snr>=15?"g":m.snr>=8?"w":"r") : "",
    m.acc!=null ? row("Diction on what you read", m.acc+"%", m.acc>=85?"g":m.acc>=65?"w":"r") : "",
    m.coverage!=null ? row("Passage reached", m.coverage+"%", m.coverage>=90?"g":m.coverage>=60?"w":"r") : "",
    m.var!=null ? row("Word variety", m.var+"%", m.var>=52?"g":"w") : "",
    row("Deliberate pauses", m.goodPauses, m.goodPauses>=3?"g":"w"),
    row("Longest silence", m.longPause.toFixed(1)+"s", m.longPause<3?"g":"w"),
    row("Words spoken", m.words, ""),
    row("Speaking time", Math.round(100-(m.quiet||0))+"% of session", ""),
    m.room!=null ? row("Room noise", m.room + "/100", m.room<12?"g":m.room<34?"w":"r") : "",
    m.usedWord!=null ? row("Used the target word", m.usedWord?"yes":"no", m.usedWord?"g":"r") : ""
  ].join("");

  $("r-notes").innerHTML = coachNotes(m, S.run, sess.drill, sess.score)
    .map(([h,b])=>`<li><b>${esc(h)}</b> ${esc(b)}</li>`).join("");
  $("r-said")._cur = undefined;
  renderRead(sess);
  renderSaid(sess);

  // if this drill was part of today's session, hand them straight to the next one
  const plan = readPlan(), nxt = nextInPlan(plan), inPlan = plan.drills.includes(sess.drill);
  const nextBtn = $("planNextBtn");
  nextBtn.hidden = !(inPlan && nxt);
  $("againBtn").className = nextBtn.hidden ? "btn primary" : "btn";
  if(!nextBtn.hidden) nextBtn.textContent = "Next: " + drillById(nxt).name;
  if(inPlan) $("r-kicker").textContent += nxt
    ? ` · ${plan.done.length} of ${plan.drills.length} done today`
    : " · today's session complete";

  renderLocalFindings(sess);
  paintTiers();
}

/* ══ UI PRIMITIVES ══════════════════════════════════════════════
   Native takes on the patterns these effects libraries popularised:
   number ticker, radial gauge, spotlight card, split-text reveal.      */

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const scoreColor = v => v>=76 ? css("--meter") : v>=55 ? css("--tungsten") : css("--live");

/* number ticker */
function countTo(el, target, ms=1200){
  if(reduced()){ el.textContent = target; return; }
  const t0 = performance.now();
  (function step(now){
    const p = Math.min(1, (now - t0)/ms);
    el.textContent = Math.round(target * (1 - Math.pow(1-p, 4)));   // easeOutQuart
    if(p < 1) requestAnimationFrame(step);
  })(t0);
}

/* radial gauges — one per scored component, so the weakest link is obvious */
function drawRings(parts){
  const box = $("r-rings"), head = $("ringHead");
  head.style.display = parts && parts.length ? "" : "none";
  if(!parts || !parts.length){ box.innerHTML = ""; return; }
  const R = 26, C = 2*Math.PI*R;
  box.innerHTML = parts.map((p,i)=>{
    const col = scoreColor(p.v);
    return `<div class="ring" data-reveal style="--i:${i}">
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
        <circle class="tr" cx="34" cy="34" r="${R}" fill="none" stroke-width="6"/>
        <circle class="fg" cx="34" cy="34" r="${R}" fill="none" stroke-width="6" stroke="${col}"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"
          data-off="${(C*(1 - p.v/100)).toFixed(1)}"/>
      </svg>
      <div class="rv" style="color:${col}">${p.v}</div>
      <div class="rk">${esc(p.label)}</div>
    </div>`;
  }).join("");
  reveal(box);
  // set the real offset on the next frame so the arc sweeps into place
  requestAnimationFrame(()=> box.querySelectorAll(".fg")
    .forEach(c => c.style.strokeDashoffset = c.dataset.off));
}

/* spotlight that follows the pointer across the drill cards */
export function wireSpotlight(){
  $("drillGrid").addEventListener("pointermove", e => {
    const card = e.target.closest(".card"); if(!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
}

/* split the headline so each word can arrive on its own beat */
export function splitHero(){
  [["Say","it","once."], ["Say","it","clearly."]].forEach((line, li) => {
    $("ln" + (li+1)).innerHTML = line
      .map((w,i)=>`<span class="w" data-reveal style="--i:${li*3 + i}">${w}</span>`).join(" ");
  });
}

/* play the staggered reveal on everything inside root that asks for one */
export function reveal(root){
  if(reduced()) return;
  const els = (root || document).querySelectorAll("[data-reveal]");
  els.forEach(el => el.classList.add("pre"));
  // two frames: one to commit .pre, one to remove it so the transition runs
  requestAnimationFrame(()=> requestAnimationFrame(()=>
    els.forEach(el => el.classList.remove("pre"))));
}

/* ══ DURATION PICKER ════════════════════════════════════════════ */

const DUR_LABEL = {30:"30s", 60:"1 min", 90:"90s", 120:"2 min"};
const SENS = [["Strict",0.7], ["Normal",1], ["Quiet voice",1.5]];
export function buildSetup(){
  const row = $("setupRow");
  // reading drills take their length from the passage, so only offer it elsewhere
  const len = S.run.target ? "" :
    `<span class="lab">Length</span>` + Object.keys(DUR_LABEL).map(d =>
      `<button class="pill" data-dur="${d}" aria-pressed="${+d === S.dur}">${DUR_LABEL[d]}</button>`).join("");
  row.innerHTML = len +
    `<span class="lab"${len ? ' style="margin-left:12px"' : ""}>Mic</span>` +
    SENS.map(([k,v]) =>
      `<button class="pill" data-sens="${v}" aria-pressed="${S.vad.sens === v}">${k}</button>`).join("");
}
$("setupRow").addEventListener("click", e => {
  const b = e.target.closest("[data-dur],[data-sens]");
  if(!b || S.running) return;
  const group = b.dataset.dur ? "dur" : "sens";
  if(group === "dur"){ S.dur = +b.dataset.dur; $("clock").textContent = fmt(S.dur); }
  else S.vad.sens = +b.dataset.sens;
  // only repaint the group that was clicked
  [...$("setupRow").querySelectorAll(`[data-${group}]`)].forEach(p =>
    p.setAttribute("aria-pressed", p === b));
});

/* ══ FOLLOW-ALONG TRANSCRIPT ═══════════════════════════════════ */

/* The input side of the session: the passage you were given, marked with what
   actually came through — or, for the drills with no set text, the prompt you
   were answering, so the score has something to be a score *of*. */
function renderRead(sess){
  const wrap = $("readWrap"), box = $("r-read"), hint = $("readHint"), title = $("readTitle");
  const target = sess.run && sess.run.target;

  if(target){
    title.textContent = "What you read";
    const st = readStats(sess.text || "", target);
    hint.textContent = st.covered === 0 ? "Nothing came through"
      : st.missed
        ? `${st.missed} word${st.missed>1?"s":""} didn’t come through — usually a swallowed consonant`
        : st.coverage < 100 ? "Every word you reached came through"
        : "Every word came through";
    // the display string may carry "|" breath marks; they are not target words,
    // so they render as markers without consuming a match index
    let i = 0;
    box.innerHTML = tokens(sess.run.display || target).map(w => {
      if(w === "|") return `<span class="brk">‖</span>`;
      const k = i++;
      // past where you got to is "not reached", which is not the same as misheard
      const cls = k >= st.covered ? "unread" : st.hit[k] ? "hit" : "miss";
      return `<w class="${cls}">${esc(w)}</w>`;
    }).join(" ");
    wrap.style.display = "";
    return;
  }

  const q = sess.run && sess.run.question;
  if(!q){ wrap.style.display = "none"; return; }
  title.textContent = "What you were asked";
  hint.textContent = sess.run.framework ? sess.run.framework : "";
  box.innerHTML = `<div class="q">${esc(q)}</div>`;
  wrap.style.display = "";
}

/* Render the transcript as clickable, timestamped words. */
function renderSaid(sess){
  const box = $("r-said"), hint = $("saidHint");
  const tk = tokens(sess.text || ""), times = sess.wordTimes || [];
  if(!tk.length){
    hint.style.display = "none";
    // a silent session and a broken recogniser look identical unless we say which
    const p = asrProblem(listener.supported && !listener.err ? "silent" : listener.err);
    box.innerHTML = listener.supported && !listener.err
      ? `<span class="waiting">Nothing was transcribed. The audio recorded fine — if you were
         speaking, the recogniser may not have heard you clearly. Try the <b>Quiet voice</b> mic
         setting, or move closer.</span>`
      : `<span class="waiting"><b>${esc(p.t)}.</b> ${esc(p.d)}</span>`;
    return;
  }
  // without timings (no recognition, or an old session) fall back to static text
  if(!times.length){
    box._times = null;
    hint.style.display = "none";
    box.innerHTML = paint(sess.text);
    return;
  }
  hint.style.display = "";
  box._times = tk.map((_,i) => times[i] != null ? times[i] : sess.elapsed);
  const lower = tk.map(w => norm(w));
  // reading a set passage: its crutch words are the author's, so only mark stumbles
  const reading = !!(sess.run && sess.run.target);
  box.innerHTML = tk.map((w,i) => {
    const n = lower[i];
    // two-token lookahead so "you know" and "i mean" highlight as crutches too
    const pair = i+1 < lower.length ? n + " " + lower[i+1] : "";
    const cls = HARD.includes(n) ? "f"
      : reading ? ""
      : (CRUTCH.includes(n) || CRUTCH.includes(pair)
         || (i > 0 && CRUTCH.includes(lower[i-1] + " " + n))) ? "c" : "";
    const t = times[i] != null ? times[i] : sess.elapsed;
    return `<w class="${cls}" data-t="${t.toFixed(2)}">${esc(w)}</w>`;
  }).join(" ");

  box.onclick = e => {
    const w = e.target.closest("w"); if(!w) return;
    const a = $("playback"); if(!a.src) return;
    a.currentTime = Math.max(0, +w.dataset.t - READ_LAG);
    a.play();
  };
}

/* Move the highlight to wherever the audio is now. */
function syncSaid(at){
  const box = $("r-said"), ws = box.querySelectorAll("w");
  if(!ws.length || !box._times) return;
  const cur = wordAt(box._times, at);
  if(cur === box._cur) return;                      // only touch the DOM when it changes
  box._cur = cur;
  ws.forEach((w,i) => {
    w.classList.toggle("past", i < cur);
    w.classList.toggle("now", i === cur);
  });
  if(cur >= 0) keepVisible(box, ws[cur]);
}

/* Scroll the transcript box only — never the page. */
function keepVisible(box, el){
  const top = el.offsetTop - box.offsetTop, h = el.offsetHeight;
  if(top < box.scrollTop + 8) box.scrollTop = top - 8;
  else if(top + h > box.scrollTop + box.clientHeight - 8)
    box.scrollTop = top + h - box.clientHeight + 8;
}
