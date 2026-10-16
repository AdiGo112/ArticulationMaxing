/* ui.js — The home view, routing, and every event listener.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

import { $ } from "./dom.js";
import { exportBackup, mergeBackup, parseBackup, readPlan, store, streak } from "./storage.js";
import { esc } from "./text.js";
import { audio } from "./audio.js";
import { listener } from "./speech.js";
import { DRILLS, METRIC_NAME, PACKS, drillById, dueCards, nextInPlan, trendFor } from "./drills.js";
import { css, drawHistory, drawTape } from "./canvas.js";
import { S, armCancel, begin, finish, newRun, view } from "./run.js";
import { reveal, scoreColor } from "./report.js";

/* ══ HOME ════════════════════════════════════════════════════════ */

/* The streak chip sits in the header, so it belongs to every page rather than
   to whichever one happened to draw it. It used to refresh only when you
   passed through the home view. */
function renderStreak(){
  const st = streak(store.read().sessions);
  $("streakChip").innerHTML = st ? `Day <b>${st}</b>` : `No streak <b>yet</b>`;
}

/* #home — the landing. What to do today, and the one button that starts it. */
export function renderHome(){ renderPlan(); }

/* #practice — all six drills, to browse and choose from. */
export function renderDrills(){
  const d = store.read(), ss = d.sessions;
  const best = id => { const r = ss.filter(s=>s.drill===id); return r.length ? Math.max(...r.map(s=>s.score)) : null; };
  const due = dueCards(d.cards, Date.now()).length;     // diction retry (F5)
  $("drillGrid").innerHTML = DRILLS.map((dr,i)=>{
    const b = best(dr.id);
    return `<button class="card" data-drill="${dr.id}" data-reveal style="--accent:${dr.accent};--i:${i}">
      <span class="spot" aria-hidden="true"></span>
      <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${dr.icon}"/></svg></span>
      <h3>${dr.name}</h3>
      <p class="d">${dr.desc}</p>
      <span class="meta"><span class="tag">${dr.tag}</span>
      ${dr.id === "diction" && due ? `<span class="tag">${due} due today</span>` : ""}
      ${b!=null ? `<span class="best">best ${b}</span>` : `<span class="best" style="opacity:.55">new</span>`}</span>
    </button>`;
  }).join("");
}

/* #progress — the tiles and the history canvas are in that view, but only the
   home render ever filled them, so opening #progress directly showed blanks. */
function renderStats(){
  const ss = store.read().sessions;
  const recent = ss.slice(-30);
  const avg = recent.length ? Math.round(recent.reduce((s,x)=>s+x.score,0)/recent.length) : 0;
  const bestAll = ss.length ? Math.max(...ss.map(s=>s.score)) : 0;
  const paced = ss.filter(s=>s.wpm);
  const wpm = paced.length ? Math.round(paced.slice(-10).reduce((s,x)=>s+x.wpm,0)/Math.min(paced.length,10)) : null;
  let si = 0;
  const stat = (n,k)=>`<div class="stat" data-reveal style="--i:${si++}"><div class="n">${n}</div><div class="k">${k}</div></div>`;
  $("stats").innerHTML =
    stat(ss.length, "Sessions") + stat(streak(ss), "Day streak") +
    stat(avg||"—", "Avg clarity") + stat(bestAll||"—", "Personal best") +
    stat(wpm||"—", "Recent pace");
  requestAnimationFrame(()=>drawHistory(ss));
}

/* Today's session: three drills aimed at your weakest metrics, so the choice
   is already made. The strip doubles as progress through the day. */
function renderPlan(){
  const p = readPlan(), next = nextInPlan(p), box = $("planStrip");
  const done = p.done.length, total = p.drills.length;

  $("quickStart").dataset.drill = next || p.drills[0];
  $("quickStart").querySelector(".lbl").textContent =
    !next ? "Done today" : done ? "Continue" : "Start today";
  $("quickStart").classList.toggle("complete", !next);

  $("quickNote").textContent = !next
    ? "All three done today. Come back tomorrow, or pick any drill below."
    : `${total - done} of ${total} left · about ${(total - done) * 3} minutes`;

  // goal packs (F8): one at a time, or none
  const pack = store.read().pack || "";
  $("packRow").innerHTML = `<span class="lab">Practising for</span>` +
    [["", "No goal"], ...PACKS.map(k => [k.id, k.name])].map(([id, name]) => {
      const blurb = id ? PACKS.find(k => k.id === id).blurb : "The plan follows your weakest metrics alone.";
      return `<button class="pill" data-pack="${id}" title="${esc(blurb)}" aria-pressed="${id === pack}">${esc(name)}</button>`;
    }).join("");

  box.innerHTML = p.drills.map((id, i) => {
    const d = drillById(id);
    if(!d) return "";
    const isDone = p.done.includes(id), isNext = id === next;
    const why = p.why && p.why[id];
    const reason = why
      ? "weakest: " + esc(METRIC_NAME[why.metric] || why.metric) + " · " + why.score
      : esc(d.tag.toLowerCase());
    return `<button class="planstep${isDone ? " done" : ""}${isNext ? " next" : ""}"
        data-drill="${id}" style="--accent:${d.accent}">
      <span class="pnum">${isDone ? "&#10003;" : i + 1}</span>
      <span class="pbody">
        <span class="pname">${esc(d.name)}</span>
        <span class="pwhy">${reason}</span>
      </span>
    </button>`;
  }).join("");
}

/* ══ WIRING ══════════════════════════════════════════════════════ */

function bestFor(sessions, id){
  const scores = sessions.filter(s => s.drill === id).map(s => s.score);
  return scores.length ? Math.max(...scores) : null;
}

/* A sparkline as inline SVG — no canvas, so it needs no repaint on theme change. */
function sparkline(values, colour){
  const w = 132, h = 34, pad = 3;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v,i) => {
    const x = pad + (i/(values.length-1 || 1)) * (w - pad*2);
    const y = h - pad - ((v - lo)/span) * (h - pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length-1].split(",");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${colour}" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${colour}"/>
  </svg>`;
}

function renderTrends(){
  const ss = store.read().sessions, box = $("trendWrap");
  const keys = ["pace","filler","proj","acc","cover","var","pause"];
  const rows = keys.map(k => ({ k, t: trendFor(ss, k) })).filter(r => r.t);

  if(!rows.length){
    box.innerHTML = `<div class="block"><p class="empty">Not enough history yet. After three
      sessions this breaks your score into its parts, so you can see which one is moving.</p></div>`;
    return;
  }
  box.innerHTML = `<div class="trends">` + rows.map(({k,t}) => {
    const col = scoreColor(t.now);
    const dir = t.delta > 2 ? "up" : t.delta < -2 ? "down" : "flat";
    const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
    const sign = t.delta > 0 ? "+" : "";
    return `<div class="trend">
      <div class="thead">
        <span class="tname">${esc(METRIC_NAME[k] || k)}</span>
        <span class="tdelta ${dir}">${arrow} ${sign}${t.delta}</span>
      </div>
      <div class="tnow" style="color:${col}">${t.now}</div>
      ${sparkline(t.values, col)}
      <div class="tfoot">${t.n} sessions</div>
    </div>`;
  }).join("") + `</div>`;
}

/* Recent sessions, newest first. The history chart shows the trend; this shows
   the individual runs behind it, so a bad day is legible rather than just a dip. */
function renderRecent(){
  const ss = store.read().sessions.slice().reverse().slice(0, 25);
  const box = $("recentWrap");
  if(!ss.length){
    box.innerHTML = `<div class="block"><p class="empty">Nothing here yet. Finish a drill and every run lands
      in this list — date, drill, score, pace and fillers.</p></div>`;
    return;
  }
  const fmtWhen = new Intl.DateTimeFormat(undefined,
    { day:"numeric", month:"short", hour:"numeric", minute:"2-digit" });
  box.innerHTML = `<div class="block recent">` + ss.map(s => `
    <div class="rrow">
      <b class="rscore" style="color:${scoreColor(s.score)}">${s.score}</b>
      <span class="rname">${esc(s.name)}</span>
      <span class="rwhen">${esc(fmtWhen.format(new Date(s.at)))}</span>
      <span class="rmeta">${s.wpm ? s.wpm + " wpm" : "—"}</span>
      <span class="rmeta">${s.fillers != null ? s.fillers + " filler" + (s.fillers === 1 ? "" : "s") : "—"}</span>
    </div>`).join("") + `</div>`;
}

export function renderSidebar(){
  const sessions = store.read().sessions;
  $("drillNav").innerHTML = DRILLS.map(dr => {
    const best = bestFor(sessions, dr.id);
    const active = S.drill && S.drill.id === dr.id;
    return `<a href="#drill-${dr.id}" data-drill="${dr.id}" ${active ? 'aria-current="page"' : ''}
      style="--accent:${dr.accent}"><span class="dn" aria-hidden="true"></span><span>${dr.name}</span>
      <span class="dbest">${best == null ? "new" : best}</span></a>`;
  }).join("");

  const total = sessions.length;
  const personalBest = total ? Math.max(...sessions.map(s => s.score)) : "—";
  $("sideStats").innerHTML = `
    <div><span>Sessions</span><b>${total}</b></div>
    <div><span>Streak</span><b>${streak(sessions)} day${streak(sessions) === 1 ? "" : "s"}</b></div>
    <div><span>Best clarity</span><b>${personalBest}</b></div>`;
  $("sideNote").textContent = total
    ? "Choose a drill, then chase one small improvement."
    : "Start with one drill. Your first score sets the baseline.";
}

function openMenu(){
  const side = $("side"), scrim = $("scrim"), layout = document.querySelector(".layout");
  if(!matchMedia("(max-width: 940px)").matches){
    layout.classList.remove("sidebar-collapsed");
    $("sideMenuBtn").setAttribute("aria-expanded", "true");
    $("sideMenuBtn").setAttribute("aria-label", "Hide sidebar");
    return;
  }
  side.classList.add("open");
  scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add("on"));
}

export function closeMenu(){
  const side = $("side"), scrim = $("scrim"), layout = document.querySelector(".layout");
  if(!side || !scrim) return;
  if(!matchMedia("(max-width: 940px)").matches){
    layout.classList.add("sidebar-collapsed");
    $("sideMenuBtn").setAttribute("aria-expanded", "false");
    $("sideMenuBtn").setAttribute("aria-label", "Show sidebar");
    return;
  }
  side.classList.remove("open");
  scrim.classList.remove("on");
  if(!scrim.hidden) setTimeout(() => { if(!side.classList.contains("open")) scrim.hidden = true; }, 280);
}

/* Stop a run without scoring it. Used when the user navigates away mid-session:
   they chose to leave, so the partial recording is discarded rather than saved
   as a bad score. Mirrors finish()'s teardown, minus the report. */
function abortRun(){
  if(!S.running) return;
  S.running = false;
  cancelAnimationFrame(S.raf);
  document.body.classList.remove("live");
  document.documentElement.style.setProperty("--glow", 0);
  listener.stop();
  audio.stopRecording();
  $("skipBtn").disabled = false;
}

function openDrill(id){ navigate("#" + DRILL_HASH + id); }
/* view() first, then render — a canvas in a display:none view measures 0 wide */
function goHome(){ navigate("#home"); }

/* ══ ROUTING ═════════════════════════════════════════════════════════
   The three sections are real pages, so they live in the URL: deep links,
   bookmarks and browser back all work. Drills and reports stay out of the
   history — they are session state, not places. */
const PAGES = ["home","practice","progress","guide"];

const DRILL_HASH = "drill-";

/* A drill is a place, not just state. It was previously invisible to history:
   the URL still read #progress while the booth was open, so Back skipped the
   drill and landed somewhere the user had never been. */
function routeFromHash(){
  const h = (location.hash || "").slice(1);
  if(h.startsWith(DRILL_HASH)){
    const id = h.slice(DRILL_HASH.length);
    if(drillById(id)) return { kind:"drill", id };
  }
  return { kind:"page", page: PAGES.includes(h) ? h : "home", bad: !!h && !PAGES.includes(h) };
}

function goPage(page){
  audio.close();
  view(page);
  renderStreak();                    // header: true of every page
  if(page === "home") renderHome();
  if(page === "practice") renderDrills();
  if(page === "progress"){ renderStats(); renderTrends(); renderRecent(); repaint(); }
  renderSidebar();
  reveal($("v-" + page));
}

/* Apply whatever the URL currently says. Never writes history itself, except to
   correct a hash that points nowhere — replacing it rather than pushing, so a
   bad link can't become a trap you have to press Back twice to escape. */
export function applyRoute(){
  const r = routeFromHash();
  if(S.running) abortRun();        // navigating away from a live run discards it
  armCancel();                     // ...and away from one that hasn't started yet

  if(r.kind === "drill"){
    // navigating to a drill always starts it fresh — including re-picking the
    // one whose report you are looking at, which is the obvious intent
    audio.close();
    newRun(r.id);
    renderSidebar();
    view("booth");
    return;
  }
  if(r.bad) history.replaceState(null, "", "#" + r.page);
  goPage(r.page);
}

/* Setting the hash pushes an entry and fires hashchange, which does the work —
   that is what makes Back and Forward correct. When the hash is already right
   no event fires, so apply it directly. */
function navigate(hash){
  if(location.hash === hash) applyRoute();
  else location.hash = hash;
}

addEventListener("hashchange", applyRoute);

// re-clicking the section you are already on should still take you there
document.querySelectorAll("[data-nav]").forEach(link => link.addEventListener("click", () => {
  if(location.hash === "#" + link.dataset.nav) applyRoute();
}));

$("sideMenuBtn").onclick = () => {
  if(!matchMedia("(max-width: 940px)").matches)
    document.querySelector(".layout").classList.contains("sidebar-collapsed") ? openMenu() : closeMenu();
  else closeMenu();
};
$("menuBtn").onclick = () => {
  const open = $("side").classList.contains("open");
  open ? closeMenu() : openMenu();
  $("menuBtn").setAttribute("aria-expanded", String(!open));
};
$("scrim").onclick = closeMenu;
// Escape closes the drawer, and focus goes back to the control that opened it
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && $("side").classList.contains("open")){
    closeMenu(); $("menuBtn").setAttribute("aria-expanded", "false"); $("menuBtn").focus();
  }
});

/* Choosing a pack rebuilds today's plan if none of it is done yet; otherwise
   it takes effect from tomorrow, so finished work doesn't move. */
$("packRow").addEventListener("click", e => {
  const b = e.target.closest("[data-pack]");
  if(!b) return;
  store.set("pack", b.dataset.pack || null);
  if(!readPlan().done.length) store.set("plan", null);
  renderPlan();
  $("quickNote").textContent += readPlan().done.length ? " · the new focus starts tomorrow" : "";
});

/* Waitlist (Netlify Forms). Posted with fetch so the page doesn't reload; Netlify
   accepts a urlencoded POST to any path when it carries form-name. */
$("waitlist").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.currentTarget, msg = $("waitMsg"), btn = form.querySelector("button");
  btn.disabled = true; msg.textContent = "Sending…";
  try{
    const r = await fetch("/", { method:"POST", body: new URLSearchParams(new FormData(form)),
      headers:{ "Content-Type":"application/x-www-form-urlencoded" } });
    if(!r.ok) throw new Error(r.status);
    form.reset(); msg.textContent = "Thanks — got it.";
  }catch(err){ msg.textContent = "That didn't send. Check your connection and try again."; }
  btn.disabled = false;
});

document.addEventListener("click", e=>{
  const card = e.target.closest("[data-drill]");
  if(card){ e.preventDefault(); return openDrill(card.dataset.drill); }
});
$("goBtn").onclick = () => S.running ? finish() : begin();
$("skipBtn").onclick = () => { if(!S.running) newRun(S.drill.id); };
$("exitBooth").onclick = () => { if(S.running) finish(); else goHome(); };
$("homeBtn").onclick = goHome;
// "again" means this prompt again — that is the only way to see whether you
// actually got better at it. Skip, in the booth, is what deals a new one.
$("againBtn").onclick = () => { newRun(S.drill.id, S.run); view("booth"); };
$("planNextBtn").onclick = () => {
  const nxt = nextInPlan(readPlan());
  if(nxt) openDrill(nxt); else goHome();
};

document.addEventListener("keydown", e=>{
  if(e.target.matches("input,textarea")) return;
  if(e.code==="Space" && $("v-booth").classList.contains("on")){
    e.preventDefault(); S.running ? finish() : begin();
  }
  if(e.key==="Escape" && S.running) finish();
  else if(e.key==="Escape" && S.arming) armCancel();
  else if(e.key === "Escape") closeMenu();
});

export function applyTheme(next){
  document.documentElement.dataset.theme = next;
  $("themeBtn").setAttribute("aria-label",
    next === "dark" ? "Switch to light theme" : "Switch to dark theme");
  $("themeColor").setAttribute("content", css("--ink"));
  repaint();                                  // canvases hold baked-in colours
}
$("themeBtn").onclick = () => {
  const next = document.documentElement.dataset.theme==="dark" ? "light" : "dark";
  store.set("theme", next);
  applyTheme(next);
};


/* ══ BACKUP ══════════════════════════════════════════════════════
   Logic and validation live in storage.js; this is only the two buttons. */

$("backupBtn").onclick = () => {
  const d = store.read();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(exportBackup(d, Date.now()))], { type:"application/json" }));
  a.download = `speakeasy-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $("backupMsg").textContent = `Saved ${d.sessions.length} session${d.sessions.length === 1 ? "" : "s"}. Keep the file somewhere other than this browser.`;
};
$("restoreBtn").onclick = () => $("restoreFile").click();
$("restoreFile").onchange = async e => {
  const file = e.target.files[0];
  e.target.value = "";                         // so choosing the same file again still fires
  if(!file) return;
  try{
    const backup = parseBackup(await file.text(), DRILLS.map(d => d.id));
    const { record, added } = mergeBackup(store.read(), backup);
    store.write(record);
    $("backupMsg").textContent = (added ? `Restored ${added} session${added === 1 ? "" : "s"}.` : "Nothing new — everything in that file is already here.")
      + (backup.dropped ? ` Skipped ${backup.dropped} damaged entr${backup.dropped === 1 ? "y" : "ies"}.` : "");
    renderSidebar(); applyRoute();
  }catch(err){
    $("backupMsg").textContent = err.message;
  }
};

/* redraw whatever canvas is on screen — used by theme switch and resize */
export function repaint(){
  if($("v-progress").classList.contains("on")) drawHistory(store.read().sessions);
  else if($("v-report").classList.contains("on") && S.lastSession) drawTape(S.lastSession);
}
