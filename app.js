/* app.js — the page: five steps beside one 3D picture. Every number shown comes from physics.js. */
import * as P from './physics.js?v=19';
import { createScene, GEOM } from './scene.js?v=19';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const R = String.raw, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = (x, d = 0) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const tn = (x, d = 0) => fmt(x, d).replace(/,/g, '{,}');
const tex = (el, s, display) => { if (!el) return; if (window.katex) window.katex.render(s, el, { throwOnError: false, displayMode: !!display }); else el.textContent = s; };

// ---------- state ----------
const S = { bit: 'tri', mode: 'hole', view: 'hole', flip: false, turn: true, slow: 6, cut: true, depth: 0, loop: false, q: 400, rho: 12, noz: [13, 13, 13], vn: 0, va: 0, vp: 0, step: 0 };
function derive() { const s = P.state(S.q, S.rho, S.noz); S.vn = s.vn; S.va = P.vAnnulus(S.q, GEOM.bit, GEOM.collarOD); S.vp = P.vPipe(S.q, GEOM.collarID); return s; }
derive();

const SC = createScene($('#gl'), $('#labels'), S), stage = SC.stage;
stage.cam.set(SC.cams.hole);

// ---------- words ----------
const TERMS = {
  mud: ['Drilling mud', 'The liquid pumped down the pipe while drilling. It cleans the hole bottom and carries the cuttings up to the surface.'],
  cuttings: ['Cuttings', 'The small pieces of rock the bit breaks off the hole bottom.'],
  annulus: ['Annulus', 'The ring-shaped gap between the outside of the pipe and the wall of the hole. The mud comes back up through it.'],
  collar: ['Drill collar', 'Thick, heavy pipe just above the bit. Its weight pushes the bit into the rock.'],
  nozzle: ['Nozzle', 'A small hard-metal opening in the bit. The mud speeds up through it and leaves as a jet. Its size is given in 32nds of an inch: a “13” is 13/32 in across.'],
  cone: ['Cone', 'One of the three toothed rollers of a rolling cutter bit. Each one turns on its own bearing.'],
  pdc: ['PDC cutter', 'A disc of man-made diamond bonded to a hard-metal backing. PDC stands for polycrystalline diamond compact. The book writes PCD.'],
  junk: ['Junk slot', 'The open channel between two blades. Mud and cuttings leave the face of the bit through it.'],
  gauge: ['Gauge', 'The outside diameter of the bit, which is the diameter of the hole it drills.'],
  parasitic: ['Parasitic pressure loss', 'Pump pressure used up by friction in the surface lines, inside the pipe and in the annulus. None of it reaches the hole bottom.'],
  impact: ['Jet impact force', 'The force of the jets on the hole bottom. It comes from stopping the momentum of the mud.'],
  hhp: ['Hydraulic horsepower', 'Power carried by a flowing liquid: pressure times flow rate. In field units, psi times gal/min divided by 1,714.'],
  trip: ['Trip', 'Pulling all the pipe out of the hole and running it back in, for example to change the bit. No hole is made during a trip.'],
  pin: ['Pin connection', 'The tapered thread on top of the bit. It screws into the bottom of the drill collar.'],
  dull: ['Dull bit', 'A bit that has worn until it drills too slowly to be worth keeping in the hole.']
};
const t = (k, word) => `<span class="term" data-t="${k}">${word}</span>`;
const pop = $('#pop');
document.addEventListener('click', (e) => {
  const el = e.target.closest('.term'); if (!el) { pop.hidden = true; return; }
  const [name, text] = TERMS[el.dataset.t]; pop.innerHTML = `<b>${name}</b>${text}`; pop.hidden = false;
  const r = el.getBoundingClientRect(), w = 290; pop.style.left = clamp(r.left, 8, innerWidth - w - 8) + 'px'; pop.style.top = (r.bottom + 8 + pop.offsetHeight > innerHeight ? r.top - pop.offsetHeight - 8 : r.bottom + 8) + 'px';
});

const fadeEls = [$('#gl'), $('#labels'), $('#lead')];
// ---------- labels and their leader lines ----------
const L = {}, lead = $('#lead'), NS = 'http://www.w3.org/2000/svg';
function lab(key, name, sub, pos, show, order, gaps, extra) {
  const it = stage.label(Object.assign({ name, html: name + (sub ? `<small>${sub}</small>` : ''), pos, order: order || ['r', 'l', 'ar', 'al', 'br', 'bl'], gaps: gaps || [26, 60, 100, 150, 210, 280, 350], alpha: () => it.a }, extra || {}));
  it.a = 0; it.show = show; it.line = document.createElementNS(NS, 'line'); it.dot = document.createElementNS(NS, 'circle');
  it.line.setAttribute('stroke', '#121A26'); it.line.setAttribute('stroke-width', '1.2'); it.dot.setAttribute('r', '3.2'); it.dot.setAttribute('fill', '#fff'); it.dot.setAttribute('stroke', '#121A26'); it.dot.setAttribute('stroke-width', '1.4');
  lead.append(it.line, it.dot); L[key] = it; return it;
}
const view = (...n) => () => n.includes(S.view), on = (bit, ...n) => () => S.bit === bit && n.includes(S.view);
const RM = (SC.RCO + SC.RCI) / 2;
lab('down', 'Mud going down', 'inside the pipe, to the bit', SC.fixed(0, 4.7, 0), () => S.cut && S.view === 'hole', ['l', 'al', 'bl'], [120, 160, 200]);
lab('collar', 'Drill collar', 'heavy pipe; its weight pushes the bit down', SC.fixed(SC.RCO, 5.9, 0), view('hole'), ['r', 'ar', 'br'], [60, 100, 140]);
lab('ann', 'Annulus', 'mud and cuttings going up', SC.fixed(0.9, 4.3, 0), view('hole'), ['r', 'br', 'ar'], [36, 70, 110]);
lab('bit', 'Bit', '8½ in across', SC.fixed(-0.95, 1.2, 0), view('hole'), ['l', 'al', 'bl'], [34, 70, 110]);
lab('bottom', 'Hole bottom', 'the bit breaks new rock here', SC.fixed(1.0, 0.02, 0), view('hole', 'bottom'), ['br', 'r', 'b'], [34, 70, 110]);
lab('rock2', 'Rock being drilled', '', SC.fixed(-4.3, 0.4, 0), view('hole'), ['b', 'a', 'l'], [8, 30], { optional: true });
lab('rock1', 'Rock already drilled', '', SC.fixed(-4.3, 5.6, 0), view('hole'), ['b', 'a', 'l'], [8, 30], { optional: true });
lab('ann2', 'Annulus, full of mud', 'cuttings pass the bit here and go up', SC.fixed(0.99, 1.75, 0), view('bottom', 'jets'), ['r', 'ar', 'br', 'a'], [34, 70, 110], { optional: true });
lab('wall', 'Hole wall', '', SC.fixed(-1.02, 1.5, 0), view('bottom', 'jets'), ['l', 'al', 'bl'], [34, 70, 110]);
lab('down2', 'Mud comes down inside the pipe', 'through the bit and out of the nozzles', SC.fixed(0, 2.75, 0), () => S.cut && (S.view === 'bottom' || S.view === 'jets'), ['l', 'al', 'r', 'ar'], [110, 150, 200], { optional: true });
lab('up2', 'Then up the outside', 'carrying the cuttings', SC.fixed(-0.9, 2.5, 0), () => S.cut && S.view === 'bottom', ['l', 'bl', 'al'], [40, 80, 120], { optional: true });
lab('bottom2', 'Hole bottom', 'the jets strike here', SC.fixed(1.0, 0.02, 0), view('jets'), ['br', 'r', 'b'], [34, 70, 110]);
const ST = ['studio', 'face'];
lab('t_pin', 'Pin connection', 'tapered thread; screws into the collar', SC.onBit(0.42, 2.25, 0, 12), view(...ST), null, null, { optional: true });
lab('t_shank', 'Shank', '', SC.onBit(0.62, 1.8, 15, 12), view(...ST));
lab('t_leg', 'Leg', 'one for each cone', SC.onBit(0.985, 1.05, 0, 3), on('tri', ...ST));
lab('t_cone', 'Cone', 'turns on its own bearing', SC.onBit(0.52, 0.42, 0, 3), on('tri', ...ST));
lab('t_teeth', 'Teeth', 'pressed into the rock as the cone rolls', SC.onBit(0.86, 0.1, 0, 3), on('tri', ...ST));
lab('t_noz', 'Nozzle', 'between two cones, pointing down', SC.onBit(0.64, 0.9, 60, 3), on('tri', ...ST));
lab('p_blade', 'Blade', 'fixed; part of the body', SC.onBit(0.97, 0.95, 0, 6), on('pdc', ...ST));
lab('p_cut', 'PDC cutter', 'diamond face; shears the rock', SC.onBit(0.84, 0.13, 6, 6), on('pdc', ...ST));
lab('p_junk', 'Junk slot', 'cuttings leave the face through it', SC.onBit(0.88, 0.8, 30, 6), on('pdc', ...ST));
lab('p_gauge', 'Gauge', 'holds the hole to full diameter', SC.onBit(0.975, 1.12, 0, 6), on('pdc', ...ST));
lab('p_noz', 'Nozzle', 'in the face, between blades', SC.onBit(0.27, 0.26, 60, 3), on('pdc', 'face'));
stage.onUpdate((dt) => {
  for (const k in L) {
    const it = L[k], want = it.show() ? 1 : 0; it.a = clamp(it.a + Math.sign(want - it.a) * dt * 1.6, 0, 1);
    const vis = it.rect && it.a > 0.25, p = vis ? stage.project(it.pos()) : null;
    if (!p) { it.line.style.opacity = it.dot.style.opacity = 0; continue; }
    const r = it.rect, x = clamp(p.x, r.x0, r.x1), y = clamp(p.y, r.y0, r.y1);
    it.line.setAttribute('x1', p.x); it.line.setAttribute('y1', p.y); it.line.setAttribute('x2', x); it.line.setAttribute('y2', y); it.dot.setAttribute('cx', p.x); it.dot.setAttribute('cy', p.y);
    it.line.style.opacity = it.dot.style.opacity = it.a;
  }
});
// labels keep off the bit, the buttons and the caption
stage.keepouts((project) => { const fr = $('#labels').getBoundingClientRect(), out = SC.bitBox(project); $$('.bar > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width) out.push({ x0: r.left - fr.left, y0: r.top - fr.top, x1: r.right - fr.left, y1: r.bottom - fr.top }); }); return out; });
// the hole deepens as you watch; when the picture has drilled as far as it can, it starts again
const depthEl = $('#depth'); let lastIn = -1, looping = false;
stage.onUpdate(() => {
  depthEl.hidden = S.mode !== 'hole'; const inch = Math.round(S.depth * GEOM.bit / 2 * 10) / 10;
  if (inch !== lastIn) { lastIn = inch; depthEl.innerHTML = `Hole deepened by <b>${fmt(inch, 1)} in</b>`; }
  if (S.loop && !looping) { looping = true; fadeEls.forEach(e => e.style.opacity = 0); setTimeout(() => { SC.restart(); fadeEls.forEach(e => e.style.opacity = 1); looping = false; }, 520); }
});
let hotT = 0;
function hot(key) { for (const k in L) L[k].el.classList.remove('hot'); if (!L[key]) return; L[key].el.classList.add('hot'); clearTimeout(hotT); hotT = setTimeout(() => L[key].el.classList.remove('hot'), 4500); }

// ---------- views ----------
const VIEW = {
  hole: { mode: 'hole', cam: 'hole', name: 'Whole hole' }, bottom: { mode: 'hole', cam: 'bottom', name: 'At the bit' }, jets: { mode: 'hole', cam: 'jets', name: 'Under the bit' },
  studio: { mode: 'studio', cam: 'studio', name: 'Out of the hole' }, face: { mode: 'studio', cam: 'face', flip: true, name: 'Turned over' }
};
$('#viewsel').innerHTML = Object.keys(VIEW).map(k => `<button data-v="${k}">${VIEW[k].name}</button>`).join('');
let fading = false;
function camFor(name) { const v = VIEW[name], c = Object.assign({}, SC.cams[v.cam]), asp = stage.camera.aspect; if (asp < 1.2 && v.cam !== 'hole') c.dist *= Math.min(1.8, 1.2 / asp); return c; }   // a narrow screen stands further back
function applyView(jump, dur) {   // always the view asked for last, so quick taps cannot leave the picture in between two views
  const v = VIEW[S.view]; S.mode = v.mode; S.flip = !!v.flip; paintSel();
  if (jump) stage.cam.set(camFor(S.view)); else stage.cam.to(camFor(S.view), dur);
  caption(); stage.setLimits(v.mode === 'hole' ? [42, 138] : null, v.mode === 'hole' ? 62 : 85);
}
function setView(name, dur = 2.6) {
  S.view = name; paintSel(); if (fading) return;
  if (VIEW[name].mode === S.mode) return applyView(false, dur);
  fading = true; fadeEls.forEach(e => e.style.opacity = 0);
  setTimeout(() => { applyView(true); fadeEls.forEach(e => e.style.opacity = 1); fading = false; }, 470);
}
function setBit(b) { if (S.bit === b) return; fadeEls.forEach(e => e.style.opacity = 0); setTimeout(() => { S.bit = b; paintSel(); refresh(); fadeEls.forEach(e => e.style.opacity = 1); }, 470); }
function paintSel() { $$('#viewsel button').forEach(b => b.classList.toggle('on', b.dataset.v === S.view)); $$('#bitsel button').forEach(b => b.classList.toggle('on', b.dataset.b === S.bit)); $$('#pipesel button').forEach(b => b.classList.toggle('on', (b.dataset.p === 'cut') === !!S.cut)); $('#pipesel').hidden = S.mode !== 'hole'; }
$('#viewsel').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
$('#bitsel').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setBit(b.dataset.b); });
$('#pipesel').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.cut = b.dataset.p === 'cut'; paintSel(); } });
function caption() {
  const c = $('#cap');
  if (S.mode === 'studio') { c.textContent = 'Drag to look around.'; return; }
  c.innerHTML = S.q > 0 ? `Pipe <b>${fmt(S.vp, 1)}</b> · nozzles <b>${fmt(S.vn)}</b> · annulus <b>${fmt(S.va, 1)} ft/s</b>` : 'Pump stopped: the cuttings stay on the bottom.';
}

// ---------- controls ----------
let painters = [], onChange = null;
function refresh(id) { derive(); painters.forEach(f => f()); caption(); if (onChange) onChange(id); }
const snap = (v, step) => +(Math.round(v / step) * step).toFixed(6);
function slider(o) {
  return `<div class="ctl" data-id="${o.id}"><div class="hd"><span>${o.label}<span class="lockn" hidden>fixed for this target</span></span><b></b></div><div class="sr"><button class="ng" data-d="-1" aria-label="less">−</button><input type="range" min="${o.min}" max="${o.max}" step="${o.step}" aria-label="${o.id}"><button class="ng" data-d="1" aria-label="more">+</button></div></div>`;
}
function bindSlider(o) {
  const box = $(`.ctl[data-id="${o.id}"]`), inp = $('input', box), out = $('.hd b', box);
  inp.addEventListener('input', () => { stopSweep(); o.set(+inp.value); refresh(o.id); });
  $$('.ng', box).forEach(b => b.addEventListener('click', () => { stopSweep(); o.set(clamp(snap(o.get() + b.dataset.d * o.step, o.step), o.min, o.max)); refresh(o.id); }));
  painters.push(() => { inp.value = o.get(); out.textContent = fmt(o.get(), o.dec) + ' ' + o.unit; const lk = !!(o.lock && o.lock()); inp.disabled = lk; $$('.ng', box).forEach(b => b.disabled = lk); $('.lockn', box).hidden = !lk; });
}
const QS = (lock) => ({ id: 'q', label: 'Pump rate, q', unit: 'gal/min', min: 0, max: 800, step: 10, dec: 0, get: () => S.q, set: v => S.q = v, lock });
const RS = (lock) => ({ id: 'rho', label: 'Mud density, ρ', unit: 'lbm/gal', min: 8.3, max: 18, step: 0.1, dec: 1, get: () => S.rho, set: v => S.rho = v, lock });
const nozHTML = () => `<div class="ctl"><div class="hd"><span>Three ${t('nozzle', 'nozzles')}, in 32nds of an inch<span class="lockn" id="nzlock" hidden>fixed for this target</span></span><b id="nzname"></b></div>
  <div class="noz">${[0, 1, 2].map(i => `<div class="one"><button class="ng" data-n="${i}" data-d="-1" aria-label="smaller">−</button><span class="v"></span><button class="ng" data-n="${i}" data-d="1" aria-label="larger">+</button></div>`).join('')}</div>
  <svg class="nozsvg" viewBox="0 0 400 86"></svg><p class="note" id="nznote"></p></div>`;
function bindNoz(lock) {
  $$('.noz .ng').forEach(b => b.addEventListener('click', () => { stopSweep(); const i = +b.dataset.n; S.noz[i] = clamp(S.noz[i] + (+b.dataset.d), 8, 24); refresh('d'); }));
  painters.push(() => {
    const lk = !!(lock && lock()); $$('.noz .ng').forEach(b => b.disabled = lk); $('#nzlock').hidden = !lk;
    $$('.noz .v').forEach((e, i) => e.textContent = S.noz[i]); $('#nzname').textContent = S.noz.join('-');
    const px = 60, parts = [`<line x1="16" y1="66" x2="${16 + px}" y2="66" stroke="#121A26" stroke-width="1.5"/><line x1="16" y1="60" x2="16" y2="72" stroke="#121A26" stroke-width="1.5"/><line x1="${16 + px}" y1="60" x2="${16 + px}" y2="72" stroke="#121A26" stroke-width="1.5"/><text x="${16 + px / 2}" y="54" text-anchor="middle" font-size="12" fill="#121A26">1 inch</text>`];
    S.noz.forEach((n, i) => { const x = 160 + i * 88; parts.push(`<circle cx="${x}" cy="36" r="${(n / 32 * px / 2).toFixed(2)}" fill="#121A26"/><text x="${x}" y="80" text-anchor="middle" font-size="13" fill="#121A26">${n}/32 in</text>`); });
    $('.nozsvg').innerHTML = parts.join('');
    $('#nznote').innerHTML = `To scale. Total area: <b>${fmt(P.nozArea(S.noz), 4)} in²</b>.`;
  });
}

// ---------- a small chart: one curve, the point you are at, optional band and marks ----------
function chart(svg, o) {
  const W = 400, H = 190, l = 56, r = 14, tp = 16, b = 32, N = 90, [x0, x1] = o.xs; let ymax = 0; const pts = [];
  for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0) * i / N, y = o.f(x); pts.push([x, y]); if (isFinite(y)) ymax = Math.max(ymax, y); }
  if (isFinite(o.y)) ymax = Math.max(ymax, o.y);
  const mag = Math.pow(10, Math.floor(Math.log10(ymax || 1))), top = Math.ceil((ymax || 1) / mag * 2) / 2 * mag;
  const X = x => l + (x - x0) / (x1 - x0) * (W - l - r), Y = y => H - b - clamp(y / top, 0, 1.05) * (H - b - tp);
  let s = '';
  if (o.band) s += `<rect x="${X(o.band[0])}" y="${tp}" width="${X(o.band[1]) - X(o.band[0])}" height="${H - b - tp}" fill="#0047BA" opacity="0.08"/>`;
  for (let i = 0; i <= 2; i++) { const y = top * i / 2; s += `<line x1="${l}" y1="${Y(y)}" x2="${W - r}" y2="${Y(y)}" stroke="#DAD5C9"/><text x="${l - 6}" y="${Y(y) + 4}" text-anchor="end" font-size="12.5" fill="#121A26">${fmt(y, top < 10 ? 1 : 0)}</text>`; }
  for (let i = 0; i <= 4; i++) { const x = x0 + (x1 - x0) * i / 4; s += `<text x="${X(x)}" y="${H - b + 14}" text-anchor="middle" font-size="12.5" fill="#121A26">${fmt(x, o.xdec || 0)}</text>`; }
  s += `<text x="${(l + W - r) / 2}" y="${H - 3}" text-anchor="middle" font-size="12.5" fill="#2B3A4C">${o.xlabel}</text><text x="${l}" y="11" font-size="12.5" fill="#2B3A4C">${o.ylabel}</text>`;
  s += `<path d="${pts.filter(p => isFinite(p[1])).map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="#0047BA" stroke-width="2.2"/>`;
  (o.marks || []).forEach(m => { if (m.x < x0 || m.x > x1) return; s += `<line x1="${X(m.x)}" y1="${tp}" x2="${X(m.x)}" y2="${H - b}" stroke="${m.color || '#B7791F'}" stroke-dasharray="4 3"/><text x="${clamp(X(m.x), l + 30, W - r - 34)}" y="${tp + 11 + (m.dy || 0)}" text-anchor="middle" font-size="12" fill="${m.color || '#B7791F'}">${m.label}</text>`; });
  if (isFinite(o.x) && isFinite(o.y)) s += `<line x1="${X(o.x)}" y1="${Y(o.y)}" x2="${X(o.x)}" y2="${H - b}" stroke="#121A26" stroke-dasharray="2 3"/><line x1="${l}" y1="${Y(o.y)}" x2="${X(o.x)}" y2="${Y(o.y)}" stroke="#121A26" stroke-dasharray="2 3"/><circle cx="${X(o.x)}" cy="${Y(o.y)}" r="5.5" fill="#fff" stroke="#121A26" stroke-width="2"/>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = s;
}

// ---------- a gentle sweep of one control from one end to the other ----------
let sweep = null;
function stopSweep() { if (sweep) { cancelAnimationFrame(sweep.raf); sweep.restore(); sweep = null; refresh(); } }
function playSweep(v, btn) {
  stopSweep(); const from = v.get(), t0 = performance.now(), dur = 11000;
  sweep = { restore: () => { v.set(from); if (btn) btn.textContent = 'Play it slowly'; } }; if (btn) btn.textContent = 'Stop';
  const tick = (now) => { const f = clamp((now - t0) / dur, 0, 1), e = f * f * (3 - 2 * f); v.set(snap(v.min + (v.max - v.min) * e, v.step)); refresh(v.id); if (f < 1) sweep.raf = requestAnimationFrame(tick); else setTimeout(() => { if (sweep) stopSweep(); }, 900); };
  sweep.raf = requestAnimationFrame(tick);
}

// ---------- targets ----------
function tasksHTML(list) { return list.map((k, i) => `<div class="task" data-i="${i}"><div class="q">${k.q}</div><div class="st"></div><button class="btn ghost">Start</button></div>`).join(''); }
function bindTasks(list, ctx) {
  ctx.live = -1; let held = 0;
  $$('.task').forEach((box, i) => $('.btn', box).addEventListener('click', () => { stopSweep(); ctx.live = ctx.live === i ? -1 : i; if (ctx.live === i && list[i].start) list[i].start(); held = 0; refresh(); }));
  const paint = () => $$('.task').forEach((box, i) => {
    const k = list[i], live = ctx.live === i; box.classList.toggle('live', live && !k.done); box.classList.toggle('done', !!k.done);
    $('.btn', box).textContent = k.done ? 'Again' : live ? 'Leave it' : 'Start'; $('.btn', box).hidden = live && !!k.done;
    $('.st', box).innerHTML = k.done ? '✓ ' + k.after() : live ? k.hint() : '';
  });
  painters.push(() => {
    const k = list[ctx.live];
    if (k && !k.done && !sweep) { if (k.test()) { if (!held) held = performance.now(); setTimeout(() => { if (held && performance.now() - held >= 650 && k.test() && !k.done) { k.done = true; paint(); } }, 700); } else held = 0; }
    paint();
  });
  return { locked: (id) => { const k = list[ctx.live]; return !!(k && !k.done && k.lock && k.lock.includes(id)); } };
}

// ---------- the steps ----------
const STEPS = [
  { name: 'On bottom', view: 'hole', render: stepBottom },
  { name: 'Two kinds of bit', view: 'studio', render: stepKinds },
  { name: 'The jets', view: 'jets', render: stepJets },
  { name: 'Choosing nozzles', view: 'bottom', render: stepNozzles },
  { name: 'Cost per foot', view: 'hole', render: stepCost }
];
$('#steps').innerHTML = STEPS.map((s, i) => `<button data-s="${i}"><b>${i + 1}</b>${s.name}</button>`).join('');
$('#steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b) goStep(+b.dataset.s); });
const nextRow = (i) => `<div class="next">${i > 0 ? `<button class="btn ghost" data-go="${i - 1}">← ${STEPS[i - 1].name}</button>` : '<span></span>'}${i < STEPS.length - 1 ? `<button class="btn" data-go="${i + 1}">${STEPS[i + 1].name} →</button>` : ''}</div>
  <div class="foot">Equations and worked examples: Bourgoyne, Millheim, Chenevert and Young, <i>Applied Drilling Engineering</i>, SPE Textbook Series vol. 2. <br><br>About the picture: the bit is 8½ in, the collar 6½ in outside and 2 13/16 in inside; jets, nozzles and pipe are to scale. It is slowed down (one turn of the bit in 6 s). The three mud speeds are compressed so that all can be seen, the mud is drawn thin so the bit shows through it, and the hole deepens faster than on a rig. With the pump stopped the picture stops making hole. Rock textures: Poly Haven (CC0).</div>`;
function goStep(i) {
  stopSweep(); S.step = i; painters = []; onChange = null; const panel = $('#panel'); panel.scrollTop = 0;
  $$('#steps button').forEach((b, k) => b.classList.toggle('on', k === i));
  STEPS[i].render(panel, i); $$('[data-go]', panel).forEach(b => b.addEventListener('click', () => goStep(+b.dataset.go)));
  $$('[data-tex]', panel).forEach(e => tex(e, e.dataset.tex, e.dataset.d === '1'));
  setView(STEPS[i].view); refresh();
}

// 1 -------------------------------------------------------------
function stepBottom(panel, i) {
  panel.innerHTML = `<h2>The bit on bottom</h2><div class="ref">Chapter 5, opening · §4.7</div>
  <p>Follow the ${t('mud', 'mud')} once round. Tap each step.</p>
  <button class="go" data-v="hole" data-l="down"><b>1</b>Down inside the pipe, through the ${t('collar', 'drill collar')}.</button>
  <button class="go" data-v="jets" data-l="bottom2"><b>2</b>Out of three small ${t('nozzle', 'nozzles')}, onto the hole bottom.</button>
  <button class="go" data-v="bottom" data-l="bottom"><b>3</b>The bit breaks the rock into ${t('cuttings', 'cuttings')}.</button>
  <button class="go" data-v="hole" data-l="ann"><b>4</b>Up the ${t('annulus', 'annulus')}, carrying the cuttings.</button>
  <h3>The same mud at three speeds</h3>
  ${slider(QS())}
  <table class="out"><tbody>
    <tr class="eq"><td class="n">Inside the drill collar (2 13/16 in bore)</td><td class="v" id="o_vp"></td></tr>
    <tr class="eq"><td class="n">Out of the nozzles (${S.noz.join('-')})</td><td class="v" id="o_vn"></td></tr>
    <tr class="eq"><td class="n">Up the annulus (8½ in hole, 6½ in collar)</td><td class="v" id="o_va"></td></tr>
  </tbody></table>
  <p>Narrow passage, fast mud. The nozzles are the narrowest place.</p>
  <div class="eqbox" id="eq1"></div>
  <p class="note">q gal/min · d in · A<sub>t</sub> in² · v ft/s. Set the pump to zero and watch the cuttings.</p>
  ${nextRow(i)}`;
  bindSlider(QS());
  tex($('#eq1'), R`\begin{aligned}\bar v&=\dfrac{q}{2.448\,d^{2}}&&\text{inside a pipe}\\[5pt]\bar v&=\dfrac{q}{2.448\,(d_2^{2}-d_1^{2})}&&\text{in an annulus}\\[5pt]\bar v_n&=\dfrac{q}{3.117\,A_t}&&\text{through the nozzles}\end{aligned}`, true);
  $$('.go', panel).forEach(b => b.addEventListener('click', () => { $$('.go', panel).forEach(x => x.classList.toggle('on', x === b)); setView(b.dataset.v); hot(b.dataset.l); }));
  painters.push(() => { $('#o_vp').innerHTML = fmt(S.vp, 1) + ' <small>ft/s</small>'; $('#o_vn').innerHTML = fmt(S.vn) + ' <small>ft/s</small>'; $('#o_va').innerHTML = fmt(S.va, 1) + ' <small>ft/s</small>'; });
}

// 2 -------------------------------------------------------------
function stepKinds(panel, i) {
  const partsTri = [['t_cone', 'Cone', 'studio'], ['t_teeth', 'Teeth', 'studio'], ['t_leg', 'Leg', 'studio'], ['t_noz', 'Nozzle', 'face'], ['t_shank', 'Shank', 'studio'], ['t_pin', 'Pin connection', 'studio']];
  const partsPdc = [['p_blade', 'Blade', 'studio'], ['p_cut', 'PDC cutter', 'face'], ['p_junk', 'Junk slot', 'studio'], ['p_noz', 'Nozzle', 'face'], ['p_gauge', 'Gauge', 'studio'], ['t_pin', 'Pin connection', 'studio']];
  const draw = () => {
    const tri = S.bit === 'tri', parts = tri ? partsTri : partsPdc;
    $('#kind').innerHTML = tri
      ? `<h3>Rolling cutter bit</h3><p>Three ${t('cone', 'cones')} roll on the hole bottom. Each tooth is pressed into the rock, crushes it and leaves a crater. In soft rock the cones are set off-centre so the teeth also scrape.</p>`
      : `<h3>PDC bit</h3><p>One solid piece with no bearings. Fixed blades carry the ${t('pdc', 'PDC cutters')}, which are dragged across the rock and shear it off in thin slices.</p>`;
    $('#parts').innerHTML = parts.map(p => `<button class="btn ghost" data-l="${p[0]}" data-v="${p[2]}">${p[1]}</button>`).join('');
    $$('#parts button').forEach(b => b.addEventListener('click', () => { setView(b.dataset.v); hot(b.dataset.l); }));
  };
  panel.innerHTML = `<h2>Two kinds of bit</h2><div class="ref">§5.1 Bit types available · §5.2 Rock failure mechanisms · §5.3 Bit selection</div>
  <p>The cutting parts either roll or are fixed. Pick one and turn it over.</p>
  <div class="row"><button class="btn" id="b_tri">Rolling cutter bit</button><button class="btn" id="b_pdc">PDC bit</button></div>
  <div id="kind"></div>
  <h3>Find the part</h3><div class="row" id="parts"></div>
  <div class="row"><button class="btn ghost" data-v="studio">Stand it up</button><button class="btn ghost" data-v="face">Turn it over</button><button class="btn ghost" data-v="bottom">Put it back and watch it cut</button></div>
  <h3>Side by side</h3>
  <table class="cmp"><thead><tr><th></th><th>Rolling cutter</th><th>PDC</th></tr></thead><tbody>
    <tr><td>Moving parts</td><td>Three cones on bearings</td><td>None</td></tr>
    <tr><td>How rock is broken</td><td>Crushed under each tooth; scraped as well in soft rock</td><td>Sheared by the cutters</td></tr>
    <tr><td>What wears out</td><td>Teeth and bearings</td><td>Cutters</td></tr>
    <tr><td>Where the book says to use it</td><td>The most versatile kind; a good first choice for the shallow part of a well</td><td>Uniform sections of carbonates or evaporites without hard shale stringers; not in gummy formations, which stick to the cutters</td></tr>
    <tr><td>Nozzles</td><td>Three, between the cones</td><td>In the face, between the blades</td></tr>
  </tbody></table>
  ${nextRow(i)}`;
  $('#b_tri').addEventListener('click', () => setBit('tri')); $('#b_pdc').addEventListener('click', () => setBit('pdc'));
  $$('.row [data-v]', panel).forEach(b => { if (!b.dataset.l) b.addEventListener('click', () => setView(b.dataset.v)); });
  let shown = null; painters.push(() => { if (shown !== S.bit) { shown = S.bit; draw(); } $('#b_tri').classList.toggle('ghost', S.bit !== 'tri'); $('#b_pdc').classList.toggle('ghost', S.bit !== 'pdc'); });
}

// 3 -------------------------------------------------------------
const OUTS = {
  dp: { name: 'Pressure drop across the bit', short: 'pressure drop across the bit', unit: 'psi', dec: 0, zero: 'It is zero only when the pump is stopped. Mud always has a density and a nozzle always has an area, so nothing else can bring it to zero. Larger nozzles bring it down quickly, but never all the way.' },
  vn: { name: 'Nozzle velocity', short: 'nozzle velocity', unit: 'ft/s', dec: 0, zero: 'It is zero only when the pump is stopped. Density is not in this equation at all: the same rate through the same area gives the same speed for any mud.' },
  hp: { name: 'Hydraulic power at the bit', short: 'hydraulic power at the bit', unit: 'hp', dec: 0, zero: 'It is zero when the pump is stopped. It is the pressure drop times the flow rate, and the pressure drop already grows with the square of the rate.' },
  Fj: { name: 'Jet impact force', short: 'jet impact force', unit: 'lbf', dec: 1, zero: 'It is zero when the pump is stopped. Heavier mud strikes harder at the same rate, because more mass is stopped every second.' }
};
const deq = () => Math.sqrt(S.noz.reduce((s, n) => s + n * n, 0) / 3);
const VARS = {
  q: { id: 'q', label: 'flow rate', axis: 'flow rate q, gal/min', min: 0, max: 800, step: 10, get: () => S.q, set: v => S.q = v, at: x => P.state(x, S.rho, S.noz) },
  rho: { id: 'rho', label: 'mud density', axis: 'mud density ρ, lbm/gal', min: 8.3, max: 18, step: 0.1, xdec: 1, get: () => S.rho, set: v => S.rho = v, at: x => P.state(S.q, x, S.noz) },
  d: { id: 'd', label: 'nozzle diameter', axis: 'size of three equal nozzles, 32nds of an inch', min: 8, max: 24, step: 1, get: deq, set: v => S.noz = [v, v, v], at: x => P.state(S.q, S.rho, [x, x, x]) }
};
const LAB = { out: 'dp', v: 'q', ctx: {} };
const TASKS3 = [
  { q: 'Set up the book’s Example 4.13: 12.0 lbm/gal mud, 400 gal/min, three 13/32 in nozzles.', test: () => S.q === 400 && Math.abs(S.rho - 12) < 1e-6 && S.noz.every(n => n === 13),
    hint: () => 'Set all three controls to the values of the example.', after: () => `The pressure drop is ${fmt(P.state(400, 12, [13, 13, 13]).dp)} psi, the answer to Example 4.13. The impact force is ${fmt(P.state(400, 12, [13, 13, 13]).Fj, 1)} lbf; the book prints 820 in Example 4.15.` },
  { q: 'Same mud, same rate. Only 800 psi can be spared for the bit. Change the nozzles until the drop is between 600 and 800 psi.', lock: ['q', 'rho'], start: () => { S.q = 400; S.rho = 12; },
    test: () => { const d = derive().dp; return d >= 600 && d <= 800; }, hint: () => { const d = derive().dp; return d > 800 ? `${fmt(d)} psi: too much. The nozzles are too small.` : `${fmt(d)} psi: lower than needed. The nozzles are too large.`; },
    after: () => `${S.noz.join('-')} gives ${fmt(derive().dp)} psi. Other sets work too: only the total area counts.` },
  { q: 'The mud is now 10.0 lbm/gal. Get an impact force of 820 lbf, any way you like.', lock: ['rho'], start: () => { S.rho = 10; },
    test: () => Math.abs(derive().Fj - 820) <= 16.4, hint: () => { const f = derive().Fj; return `${fmt(f, 1)} lbf: ${f > 820 ? 'too high' : 'too low'}. Wanted 820, within 2 %.`; },
    after: () => `${fmt(derive().Fj, 1)} lbf at ${fmt(S.q)} gal/min through ${S.noz.join('-')}. Lighter mud needed more rate or smaller nozzles than Example 4.15.` },
  { q: 'At 300 gal/min, make the nozzle velocity 400 ft/s (within 12 ft/s).', lock: ['q'], start: () => { S.q = 300; },
    test: () => Math.abs(derive().vn - 400) <= 12, hint: () => { const v = derive().vn; return `${fmt(v)} ft/s: ${v > 400 ? 'too fast, open a nozzle' : 'too slow, close a nozzle'}. Three equal nozzles will not do it.`; },
    after: () => `${S.noz.join('-')} gives ${fmt(derive().vn)} ft/s. The sizes did not have to be equal: this is why bits are run with sets such as 10-10-11.` }
];
function stepJets(panel, i) {
  panel.innerHTML = `<h2>The jets</h2><div class="ref">§4.7 Flow through jet bits · Examples 4.13 to 4.15</div>
  <p>All the mud passes through the ${t('nozzle', 'nozzles')}. Change what the driller can change.</p>
  ${slider(QS())}${slider(RS())}${nozHTML()}
  <h3>What the bit gets</h3>
  <table class="out"><tbody>
    <tr class="eq"><td class="n">Total nozzle area</td><td class="v" id="v_At"></td></tr><tr class="eq"><td class="e" colspan="2" id="e_At"></td></tr>
    ${Object.keys(OUTS).map(k => `<tr data-o="${k}"><td class="n">${k === 'Fj' ? t('impact', OUTS[k].name) : k === 'hp' ? t('hhp', OUTS[k].name) : OUTS[k].name}</td><td class="v" id="v_${k}"></td></tr><tr class="eq"><td class="e" colspan="2" id="e_${k}"></td></tr>`).join('')}
  </tbody></table>
  <p class="note">C<sub>d</sub> = 0.95, the discharge coefficient the book recommends. Tap a row to chart it.</p>
  <h3>Question the equation</h3>
  <div class="row"><div class="seg" id="varsel"><button data-x="q">Flow rate alone</button><button data-x="rho">Density alone</button><button data-x="d">Nozzle size alone</button></div><button class="btn ghost" id="play">Play it slowly</button></div>
  <svg class="chart" id="ch3"></svg>
  <div class="say" id="say3"></div>
  <h3>Targets</h3>
  ${tasksHTML(TASKS3)}
  ${nextRow(i)}`;
  const tk = bindTasks(TASKS3, LAB.ctx);
  bindSlider(QS(() => tk.locked('q'))); bindSlider(RS(() => tk.locked('rho'))); bindNoz(() => tk.locked('d'));
  $$('table.out tr[data-o]').forEach(r => r.addEventListener('click', (e) => { if (e.target.closest('.term')) return; LAB.out = r.dataset.o; refresh(); }));
  $('#varsel').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { stopSweep(); LAB.v = b.dataset.x; refresh(); } });
  $('#play').addEventListener('click', () => { if (sweep) return stopSweep(); const v = VARS[LAB.v]; if (tk.locked(v.id)) return; playSweep(v, $('#play')); });
  onChange = (id) => { if (id && VARS[id] && !sweep) { LAB.v = id; paint(); } };
  const paint = () => {
    const s = derive(), [a, b, c] = S.noz, At = fmt(s.At, 4);
    $('#v_At').innerHTML = `${At} <small>in²</small>`; tex($('#e_At'), R`A_t=\tfrac{\pi}{4}\,\dfrac{${a}^2+${b}^2+${c}^2}{32^2}`);
    for (const k in OUTS) $('#v_' + k).innerHTML = `${fmt(s[k], OUTS[k].dec)} <small>${OUTS[k].unit}</small>`;
    tex($('#e_vn'), R`\bar v_n=\dfrac{q}{3.117\,A_t}=\dfrac{${tn(S.q)}}{3.117\,(${At})}`);
    tex($('#e_dp'), R`\Delta p_b=\dfrac{8.311\times10^{-5}\,\rho\,q^{2}}{C_d^{2}A_t^{2}}=\dfrac{8.311\times10^{-5}\,(${fmt(S.rho, 1)})(${tn(S.q)})^{2}}{(0.95)^{2}(${At})^{2}}`);
    tex($('#e_hp'), R`P_{Hb}=\dfrac{\Delta p_b\,q}{1{,}714}=\dfrac{(${tn(s.dp)})(${tn(S.q)})}{1{,}714}`);
    tex($('#e_Fj'), R`F_j=0.01823\,C_d\,q\sqrt{\rho\,\Delta p_b}=0.01823\,(0.95)(${tn(S.q)})\sqrt{(${fmt(S.rho, 1)})(${tn(s.dp)})}`);
    $$('table.out tr[data-o]').forEach(r => r.classList.toggle('on', r.dataset.o === LAB.out));
    $$('#varsel button').forEach(b2 => b2.classList.toggle('on', b2.dataset.x === LAB.v));
    const v = VARS[LAB.v], o = OUTS[LAB.out], x = v.get();
    chart($('#ch3'), { xs: [v.min, v.max], f: xx => v.at(xx)[LAB.out], x, y: s[LAB.out], xlabel: v.axis, ylabel: o.name + ', ' + o.unit, xdec: v.xdec });
    const xr = x > 0 ? x : 1, ratio = v.at(2 * xr)[LAB.out] / v.at(xr)[LAB.out];
    const what = Math.abs(ratio - 1) < 1e-9 ? `the ${o.short} does not change` : ratio > 1 ? `the ${o.short} is multiplied by ${fmt(ratio, 2)}` : `the ${o.short} is divided by ${fmt(1 / ratio, 2)}`;
    $('#say3').innerHTML = `<b>Double the ${v.label} alone:</b> ${what}.<br><b>When is it zero?</b> ${o.zero}`;
  };
  painters.push(paint);
}

// 4 -------------------------------------------------------------
const N4 = { mult: 1, crit: 'impact', ctx: {} };
const TASKS4 = [
  { q: 'Find the pump rate that gives the bit the most, within what this pump can do.', lock: ['mult'], start: () => { N4.mult = 1; },
    test: () => Math.abs(S.q - P.well431(N4.mult).best(N4.crit).q) <= 5, hint: () => { const b = P.well431(N4.mult).best(N4.crit).q; return S.q < b ? 'The curve is still rising. Go higher.' : 'Past the best point. Come down.'; },
    after: () => { const w = P.well431(N4.mult), a = w.at(S.q); return `${fmt(S.q)} gal/min. Friction takes ${fmt(a.pd)} psi and ${fmt(a.pb)} psi is left for the bit. The book reads 1,300 and 1,700 psi from its graph (Example 4.31).`; } },
  { q: 'Now choose three nozzles that use that pressure: the pump should run between 2,900 and 3,000 psig.', lock: ['mult', 'q'], start: () => { N4.mult = 1; S.q = snap(P.well431(1).best(N4.crit).q, 5); },
    test: () => { const p = pump4(); return p >= 2900 && p <= 3000; }, hint: () => { const p = pump4(); return p > 3000 ? `${fmt(p)} psig: over the limit. The nozzles are too small.` : `${fmt(p)} psig: pressure is left unused. The nozzles are too large.`; },
    after: () => `${S.noz.join('-')}: total area ${fmt(P.nozArea(S.noz), 3)} in², pump at ${fmt(pump4())} psig. The book’s answer is an area of 0.47 in².` }
];
const pump4 = () => P.well431(N4.mult).pd(S.q) + P.dpBit(S.rho, S.q, P.nozArea(S.noz));
function stepNozzles(panel, i) {
  const X = P.EX431; S.rho = X.rho; S.q = clamp(S.q, X.qmin, 650); if (S.step4 !== true) { S.q = 485; S.noz = [12, 12, 12]; S.step4 = true; }
  panel.innerHTML = `<h2>Choosing the nozzles</h2><div class="ref">§4.13 Jet bit nozzle size selection · Example 4.31</div>
  <p>The pump has a pressure limit. Friction in the pipe and ${t('annulus', 'annulus')} takes part of it (the ${t('parasitic', 'parasitic loss')}); the rest is spent at the bit.</p>
  <div class="given"><div><span>Mud density</span><b>9.6 lbm/gal</b></div><div><span>Pump</span><b>1,250 hp, efficiency 0.91</b></div><div><span>Highest surface pressure allowed</span><b>3,000 psig</b></div><div><span>Least rate that lifts the cuttings</span><b>225 gal/min</b></div><div><span>Measured with 12-12-12 in the hole</span><b>2,800 psig at 485 gal/min</b></div><div><span></span><b>900 psig at 247 gal/min</b></div></div>
  <h3>What the two readings tell you</h3>
  <table class="cmp"><thead><tr><th>Rate</th><th class="r">Pump</th><th class="r">Across the bit</th><th class="r">Friction</th></tr></thead><tbody id="rd4"></tbody></table>
  <div class="eqbox" id="m4"></div>
  <h3>Spend the pressure</h3>
  <div class="row"><div class="seg" id="crit"><button data-c="impact">Most impact force</button><button data-c="hp">Most hydraulic power</button></div></div>
  ${slider({ id: 'q', label: 'Pump rate, q', min: 225, max: 650, step: 5 })}
  ${slider({ id: 'mult', label: 'Friction, compared with this well', min: 0.5, max: 3, step: 0.1 })}
  <div class="pbar"><div class="d" id="pb_d"></div><div class="b" id="pb_b"></div></div>
  <p class="note" id="pb_n"></p>
  <svg class="chart" id="ch4"></svg>
  <div class="say" id="say4"></div>
  <h3>Then size the nozzles</h3>
  ${nozHTML()}
  <table class="out"><tbody><tr class="eq"><td class="n">Area that would use all the pressure left</td><td class="v" id="v_need"></td></tr><tr class="eq"><td class="e" colspan="2" id="e_need"></td></tr><tr class="eq"><td class="n">Pump pressure with the nozzles above</td><td class="v" id="v_pump"></td></tr></tbody></table>
  <h3>Targets</h3>${tasksHTML(TASKS4)}
  ${nextRow(i)}`;
  const tk = bindTasks(TASKS4, N4.ctx);
  bindSlider({ id: 'q', unit: 'gal/min', min: 225, max: 650, step: 5, dec: 0, get: () => S.q, set: v => S.q = v, lock: () => tk.locked('q') });
  bindSlider({ id: 'mult', unit: '×', min: 0.5, max: 3, step: 0.1, dec: 1, get: () => N4.mult, set: v => N4.mult = v, lock: () => tk.locked('mult') });
  bindNoz();
  $('#crit').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { N4.crit = b.dataset.c; refresh(); } });
  const w0 = P.well431(1);
  $('#rd4').innerHTML = [[485, 2800, w0.pb1, w0.pd1], [247, 900, w0.pb2, w0.pd2]].map(r => `<tr><td>${r[0]} gal/min</td><td class="r">${fmt(r[1])} psig</td><td class="r">${fmt(r[2])} psi</td><td class="r">${fmt(r[3])} psi</td></tr>`).join('');
  tex($('#m4'), R`\begin{aligned}\Delta p_d&=c\,q^{m},\qquad m=\dfrac{\log(${fmt(w0.pd1)}/${fmt(w0.pd2)})}{\log(485/247)}=${fmt(w0.m, 2)}\\[6pt]q_{\max}&=\dfrac{1{,}714\,P_{HP}\,E}{p_{\max}}=\dfrac{1{,}714\,(1{,}250)(0.91)}{3{,}000}=${fmt(w0.qmax)}\ \text{gal/min}\end{aligned}`, true);
  painters.push(() => {
    const w = P.well431(N4.mult), a = w.at(S.q), imp = N4.crit === 'impact', key = imp ? 'Fj' : 'hp', b = w.best(N4.crit), frac = imp ? 2 / (w.m + 2) : 1 / (w.m + 1);
    $$('#crit button').forEach(x => x.classList.toggle('on', x.dataset.c === N4.crit));
    const wd = clamp(a.pd / X.pmax * 100, 0, 100); $('#pb_d').style.width = wd + '%'; $('#pb_b').style.width = (100 - wd) + '%'; $('#pb_d').textContent = `friction ${fmt(a.pd)} psi`; $('#pb_b').textContent = `bit ${fmt(a.pb)} psi`;
    $('#pb_n').innerHTML = `Friction is taking <b>${fmt(a.pd / X.pmax, 3)}</b> of the 3,000 psig. For the ${imp ? 'most impact force' : 'most hydraulic power'} it should take <b>${fmt(frac, 3)}</b>, which is ${imp ? '2/(m+2)' : '1/(m+1)'}.`;
    chart($('#ch4'), { xs: [100, 1100], f: q => w.at(q)[key], x: S.q, y: a[key], xlabel: 'pump rate q, gal/min (shaded: what this pump and hole allow)', ylabel: (imp ? 'Jet impact force, lbf' : 'Hydraulic power at the bit, hp') + ' with the pump at 3,000 psig', band: [X.qmin, w.qmax],
      marks: [{ x: b.free, label: 'peak of the curve' }] });
    const inside = b.free <= w.qmax && b.free >= X.qmin;
    $('#say4').innerHTML = `<b>Now:</b> ${fmt(a.Fj)} lbf of impact force and ${fmt(a.hp)} hp at the bit.<br>` + (inside
      ? `The peak of the curve is at ${fmt(b.free)} gal/min, inside what the pump can deliver. That is the rate to run.`
      : b.free > w.qmax ? `The peak of the curve is at ${fmt(b.free)} gal/min, but 1,250 hp cannot deliver more than ${fmt(w.qmax)} gal/min at 3,000 psig. The best this pump can do is its highest rate.` : `The peak is below the least rate that lifts the cuttings, so the least rate is used.`)
      + `<br><b>When is it zero?</b> At the rate where friction alone uses all 3,000 psig, nothing is left for the bit. Raise the friction and watch the curve fall back to zero sooner.`;
    $('#v_need').innerHTML = isFinite(a.At) ? `${fmt(a.At, 3)} <small>in²</small>` : '—';
    tex($('#e_need'), R`(A_t)_{opt}=\sqrt{\dfrac{8.311\times10^{-5}\,\rho\,q^{2}}{C_d^{2}\,\Delta p_b}}=\sqrt{\dfrac{8.311\times10^{-5}\,(9.6)(${tn(S.q)})^{2}}{(0.95)^{2}(${tn(a.pb)})}}`);
    const p = pump4(); $('#v_pump').innerHTML = `<span style="color:${p > X.pmax ? 'var(--red)' : 'inherit'}">${fmt(p)} <small>psig${p > X.pmax ? ' · over the limit' : ''}</small></span>`;
  });
}

// 5 -------------------------------------------------------------
const C5 = { Cr: 400, tt: 7, ctx: {} };
const TASKS5 = [
  { q: 'The rig costs $400 an hour and a trip takes 7 hours. Which bit drills the cheapest foot?', start: () => { C5.Cr = 400; C5.tt = 7; }, test: () => C5.Cr === 400 && C5.tt === 7,
    hint: () => 'Set the two controls to those values.', after: () => 'Bit B, at $42.56 per foot (Example 1.5). It is the most expensive bit to buy.' },
  { q: 'Keep the 7-hour trip. Find the rig cost at which bit A and bit B cost the same per foot.', lock: ['tt'], start: () => { C5.tt = 7; },
    test: () => Math.abs(P.cost15(P.BITS15[0], C5.Cr, C5.tt) - P.cost15(P.BITS15[1], C5.Cr, C5.tt)) <= 0.15,
    hint: () => { const d = P.cost15(P.BITS15[0], C5.Cr, C5.tt) - P.cost15(P.BITS15[1], C5.Cr, C5.tt); return d > 0 ? `A costs $${fmt(d, 2)} more per foot than B. Make the rig cheaper.` : `A costs $${fmt(-d, 2)} less per foot than B. Make the rig dearer.`; },
    after: () => `About $${fmt(C5.Cr)} an hour. On a cheaper rig the $800 bit wins; on a dearer one the bit that stays in the hole longer wins, because each ${'trip'} costs rig time.` }
];
function stepCost(panel, i) {
  panel.innerHTML = `<h2>Cost per foot</h2><div class="ref">§5.3 Bit selection and evaluation · Eq. 1.16 · Example 1.5</div>
  <p>Bits are compared by what each foot of hole costs. The rig is paid by the hour, also during the ${t('trip', 'trip')} to change a ${t('dull', 'dull bit')}.</p>
  <div class="eqbox" data-tex="${R`C_f=\dfrac{C_b+C_r\,(t_b+t_c+t_t)}{\Delta D}`}" data-d="1"></div>
  <p class="note">C<sub>b</sub> bit cost, $ · C<sub>r</sub> rig cost, $/hr · t<sub>b</sub> hours rotating · t<sub>c</sub> hours making connections · t<sub>t</sub> trip hours · ΔD feet drilled by the bit.</p>
  ${slider({ id: 'Cr', label: 'Rig cost, C<sub>r</sub>', min: 100, max: 1000, step: 10 })}${slider({ id: 'tt', label: 'Trip time, t<sub>t</sub>', min: 2, max: 14, step: 0.5 })}
  <table class="cmp"><thead><tr><th>Bit</th><th class="r">Price</th><th class="r">Hours</th><th class="r">ft/hr</th><th class="r">Feet</th><th class="r">$/ft</th></tr></thead><tbody id="tb5"></tbody></table>
  <div class="eqbox" id="e5"></div>
  <svg class="chart" id="ch5"></svg>
  <div class="say" id="say5"></div>
  <h3>Targets</h3>${tasksHTML(TASKS5)}
  ${nextRow(i)}`;
  const tk = bindTasks(TASKS5, C5.ctx);
  bindSlider({ id: 'Cr', unit: '$/hr', min: 100, max: 1000, step: 10, dec: 0, get: () => C5.Cr, set: v => C5.Cr = v, lock: () => tk.locked('Cr') });
  bindSlider({ id: 'tt', unit: 'hr', min: 2, max: 14, step: 0.5, dec: 1, get: () => C5.tt, set: v => C5.tt = v, lock: () => tk.locked('tt') });
  painters.push(() => {
    const c = P.BITS15.map(b => P.cost15(b, C5.Cr, C5.tt)), best = c.indexOf(Math.min(...c)), B = P.BITS15[best];
    $('#tb5').innerHTML = P.BITS15.map((b, k) => `<tr class="${k === best ? 'best' : ''}"><td>${b.name}</td><td class="r">$${fmt(b.Cb)}</td><td class="r">${fmt(b.tb, 1)}</td><td class="r">${fmt(b.rop, 1)}</td><td class="r">${fmt(b.rop * b.tb, 0)}</td><td class="r">$${fmt(c[k], 2)}</td></tr>`).join('');
    tex($('#e5'), R`\text{Bit ${B.name}:}\quad C_f=\dfrac{${tn(B.Cb)}+${tn(C5.Cr)}\,(${fmt(B.tb, 1)}+${fmt(B.tc, 1)}+${fmt(C5.tt, 1)})}{${fmt(B.rop, 1)}\,(${fmt(B.tb, 1)})}=\$${fmt(c[best], 2)}/\text{ft}`, true);
    const W = 400, H = 190, l = 56, r = 14, tp = 16, bt = 32, x0 = 100, x1 = 1000, top = 120, Xp = x => l + (x - x0) / (x1 - x0) * (W - l - r), Yp = y => H - bt - clamp(y / top, 0, 1) * (H - bt - tp), col = ['#B7791F', '#0047BA', '#2E7D5B'];
    let s = ''; for (let k = 0; k <= 3; k++) { const y = top * k / 3; s += `<line x1="${l}" y1="${Yp(y)}" x2="${W - r}" y2="${Yp(y)}" stroke="#DAD5C9"/><text x="${l - 6}" y="${Yp(y) + 4}" text-anchor="end" font-size="12.5" fill="#121A26">${fmt(y)}</text>`; }
    for (let k = 0; k <= 3; k++) { const x = x0 + (x1 - x0) * k / 3; s += `<text x="${Xp(x)}" y="${H - bt + 14}" text-anchor="middle" font-size="12.5" fill="#121A26">${fmt(x)}</text>`; }
    s += `<text x="${(l + W - r) / 2}" y="${H - 3}" text-anchor="middle" font-size="12.5" fill="#2B3A4C">rig cost, $/hr</text><text x="${l}" y="11" font-size="12.5" fill="#2B3A4C">cost per foot, $/ft</text>`;
    const ends = P.BITS15.map((b, k) => ({ k, y: Yp(P.cost15(b, x1, C5.tt)) })).sort((p, q) => p.y - q.y); for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
    P.BITS15.forEach((b, k) => { s += `<line x1="${Xp(x0)}" y1="${Yp(P.cost15(b, x0, C5.tt))}" x2="${Xp(x1)}" y2="${Yp(P.cost15(b, x1, C5.tt))}" stroke="${col[k]}" stroke-width="2.2"/><circle cx="${Xp(C5.Cr)}" cy="${Yp(c[k])}" r="4.5" fill="#fff" stroke="${col[k]}" stroke-width="2"/>`; });
    ends.forEach(e => { s += `<text x="${W - r - 2}" y="${e.y - 4}" text-anchor="end" font-size="12.5" font-weight="700" fill="${col[e.k]}">${P.BITS15[e.k].name}</text>`; });
    s += `<line x1="${Xp(C5.Cr)}" y1="${tp}" x2="${Xp(C5.Cr)}" y2="${H - bt}" stroke="#121A26" stroke-dasharray="2 3"/>`;
    $('#ch5').setAttribute('viewBox', `0 0 ${W} ${H}`); $('#ch5').innerHTML = s;
    $('#say5').innerHTML = `<b>Cheapest foot now:</b> bit ${B.name}, $${fmt(c[best], 2)} per foot.<br><b>When is the bit’s price all that matters?</b> Only if the rig were free (C<sub>r</sub> = 0). The dearer the rig and the longer the trip, the more a bit is worth for staying on bottom.<br><b>Can the cost be zero?</b> No. A bit that drills no footage makes it grow without limit: ΔD is underneath.`;
  });
}

// ---------- start ----------
paintSel();
const boot = () => { goStep(0); };
if (window.katex) boot(); else { const iv = setInterval(() => { if (window.katex) { clearInterval(iv); boot(); } }, 60); setTimeout(() => { if (!window.katex) { clearInterval(iv); boot(); } }, 5000); }
window.__bits = { S, SC, stage, L, goStep, setView, setBit, refresh, P, TASKS3, TASKS4, TASKS5, N4, C5, LAB };
