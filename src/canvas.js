/* canvas.js — Every canvas: the tape, the idle wave, the trend sparklines.
   Speakeasy. Native ES modules, no build step: the browser loads these directly. */

/* ══ CANVAS ═══════════════════════════════════════════════════════ */

function fit(cv){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if(cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)){
    cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  }
  const c = cv.getContext("2d");
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,w,h);
  return {c,w,h};
}
export const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* home: a drifting pseudo-speech envelope, drawn in the same bars as the tape
   so the hero is a preview of what a session actually produces */
let idleT = 0;
export function drawIdle(){
  const cv = document.getElementById("idleWave"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv), mid = h/2, step = 4;
  idleT += 0.009;
  c.fillStyle = css("--tungsten");
  for(let x=0; x<w; x+=step){
    const p = x/w;
    // three incommensurate rates: syllables, words, phrases
    const v = Math.abs(Math.sin(p*27 + idleT*3.1))
            * (0.42 + 0.58*Math.abs(Math.sin(p*8.5 - idleT*1.7)))
            * (0.30 + 0.70*Math.abs(Math.sin(p*2.9 + idleT*0.6)))
            * Math.sin(p*Math.PI);                    // fade in and out at the edges
    const bh = Math.max(1, v*(h*0.46));
    c.globalAlpha = 0.45 + v*0.55;
    c.fillRect(x, mid-bh, step-1.5, bh*2);
  }
  c.globalAlpha = 1;
}

/* booth: scrolling live level, last ~9 seconds */
export function drawRibbon(buf, bufV, flashUntil){
  const cv = document.getElementById("ribbon"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv), mid = h/2, n = buf.length, step = 2.5;
  const cols = Math.floor(w/step);
  c.strokeStyle = css("--edge-soft"); c.lineWidth = 1;
  c.beginPath(); c.moveTo(0,mid+.5); c.lineTo(w,mid+.5); c.stroke();
  const hot = performance.now() < flashUntil;
  const voice = hot ? css("--live") : css("--tungsten"), room = css("--faint");
  for(let i=0;i<cols;i++){
    const k = n-cols+i, v = buf[k]; if(v===undefined) continue;
    const speech = bufV && bufV[k];
    // room tone stays short, dim and grey — only your voice gets height and colour
    const bh = Math.max(1, (speech ? v : Math.min(v,.14)) * (h*.42));
    c.fillStyle = speech ? voice : room;
    c.globalAlpha = speech ? .62 + v*.38 : .45;
    c.fillRect(i*step, mid-bh, step-1.2, bh*2);
  }
  c.globalAlpha = 1;
}

/* report: the tape — the whole session as one object you can scrub */
export function drawTape(sess){
  const cv = document.getElementById("tape"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv), mid = h/2, n = sess.tape.length;
  if(!n) return;
  c.strokeStyle = css("--edge-soft"); c.lineWidth = 1;
  c.beginPath(); c.moveTo(0,mid+.5); c.lineTo(w,mid+.5); c.stroke();

  const step = 3, cols = Math.floor(w/step), per = n/cols;
  const voice = css("--tungsten"), room = css("--faint"), tv = sess.tapeV || [];
  for(let i=0;i<cols;i++){
    let v=0, spoke=0, a=Math.floor(i*per), b=Math.max(a+1,Math.floor((i+1)*per));
    for(let k=a;k<b && k<n;k++){ v = Math.max(v, sess.tape[k]); if(tv[k]) spoke = 1; }
    // a column counts as voice only if some frame in it was speech
    const bh = Math.max(1, (spoke ? v : Math.min(v,.14)) * (h*.40));
    c.fillStyle = spoke ? voice : room;
    c.globalAlpha = spoke ? .5 + v*.5 : .45;
    c.fillRect(i*step, mid-bh, step-1.2, bh*2);
  }
  c.globalAlpha = 1;
  const X = t => (t/sess.elapsed) * w;
  sess.marks.forEach(m=>{
    const x = X(m.t);
    if(m.type==="filler"){
      c.fillStyle = css("--live"); c.fillRect(x-1, 2, 2, h-4);
      c.beginPath(); c.arc(x, 6, 3, 0, 7); c.fill();
    }else{
      c.fillStyle = css("--meter"); c.fillRect(x-1, h-9, 2, 7);
    }
  });
  if(sess.playhead != null){
    c.fillStyle = css("--chalk"); c.fillRect(X(sess.playhead)-.5, 0, 1.5, h);
  }
}

/* home: clarity over the last 30 sessions */
export function drawHistory(sessions){
  const cv = document.getElementById("history"); if(!cv || !cv.clientWidth) return;
  const {c,w,h} = fit(cv);
  const d = sessions.slice(-30);
  document.getElementById("histL").textContent =
    d.length ? d.length + (d.length===1?" session":" sessions") : "No sessions yet";
  if(!d.length){
    c.strokeStyle = css("--edge"); c.setLineDash([3,5]); c.lineWidth=1;
    c.beginPath(); c.moveTo(0,h-1); c.lineTo(w,h-1); c.stroke(); c.setLineDash([]);
    return;
  }
  const bw = Math.min(26, w/Math.max(d.length,8)), gap = Math.max(2, bw*.22);
  const step = w/d.length;
  d.forEach((s,i)=>{
    const bh = Math.max(3, (s.score/100)*(h-16));
    const x = i*step + (step-bw+gap)/2;
    c.fillStyle = s.score>=76 ? css("--meter") : s.score>=55 ? css("--tungsten") : css("--live");
    c.globalAlpha = .35 + (i/d.length)*.65;
    const r = Math.min(3, bw/3);
    c.beginPath();
    if(c.roundRect) c.roundRect(x, h-bh, bw-gap, bh, [r,r,0,0]); else c.rect(x, h-bh, bw-gap, bh);
    c.fill();
  });
  c.globalAlpha = 1;
  const avg = d.reduce((s,x)=>s+x.score,0)/d.length;
  const y = h-16 - (avg/100)*(h-16) + 16;
  c.strokeStyle = css("--dust"); c.globalAlpha=.5; c.setLineDash([2,4]);
  c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); c.setLineDash([]); c.globalAlpha=1;
}
