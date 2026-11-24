// node check.mjs — the physics against the book's worked examples, and every target on the page shown to be reachable.
import * as P from './physics.js';
let n = 0, bad = 0;
const ok = (name, got, want, tol) => { n++; const e = Math.abs(got - want); if (!(e <= tol)) { bad++; console.log('FAIL', name, 'got', got, 'want', want); } };
const yes = (name, c) => { n++; if (!c) { bad++; console.log('FAIL', name); } };

// Example 4.13: 12.0 lbm/gal, 400 gal/min, three 13/32 nozzles
let s = P.state(400, 12, [13, 13, 13]);
ok('4.13 area', s.At, 0.3889, 0.0002); ok('4.13 dp', s.dp, 1169, 1);
ok('4.14 pump hp', P.hhp(3000, 400), 700, 0.2); ok('4.14 friction hp', P.hhp(1400, 400), 327, 0.4);
ok('4.15 impact', s.Fj, 820, 1);
ok('4.12 collar velocity', P.vPipe(400, 2.5), 26.14, 0.01);
ok('4.33 against 4.31', s.vn, P.CD * Math.sqrt(s.dp / (8.074e-4 * 12)), 0.2);

// Example 4.31
const w = P.well431();
ok('4.31 pb1', w.pb1, 1894, 1); ok('4.31 pb2', w.pb2, 491, 1); ok('4.31 pd1', w.pd1, 906, 1); ok('4.31 pd2', w.pd2, 409, 1);
ok('4.31 m', w.m, 1.18, 0.005); ok('4.31 qmax', w.qmax, 650, 0.5);
ok('4.31 interval 2 pd', 2 / (1.2 + 2) * 3000, 1875, 0.5);
const b = w.best('impact'); ok('4.31 best q', b.q, 650, 0.5); yes('4.31 free optimum beyond the pump', b.free > w.qmax);
const a = w.at(b.q); ok('4.31 pd at 650 (book reads 1,300 off its graph)', a.pd, 1300, 25); ok('4.31 pb', a.pb, 1700, 25); ok('4.31 area', a.At, 0.47, 0.005);
// the optimum conditions: the derivative of each quantity is zero where the book says
for (const mult of [1, 1.5, 2, 3]) {
  const W = P.well431(mult);
  for (const [crit, key, frac] of [['hp', 'hp', 1 / (W.m + 1)], ['impact', 'Fj', 2 / (W.m + 2)]]) {
    const q0 = W.best(crit).free, f = (q) => W.at(q)[key];
    yes('maximum ' + crit + ' x' + mult, f(q0) > f(q0 * 0.99) && f(q0) > f(q0 * 1.01));
    ok('ratio ' + crit + ' x' + mult, W.pd(q0) / 3000, frac, 1e-9);
  }
}

// Example 1.5
const want = [46.81, 42.56, 46.89]; P.BITS15.forEach((bit, i) => ok('1.5 bit ' + bit.name, P.cost15(bit, 400, 7), want[i], 0.006));
{ let lo = 100, hi = 400; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; (P.cost15(P.BITS15[0], mid, 7) < P.cost15(P.BITS15[1], mid, 7)) ? lo = mid : hi = mid; } ok('1.5 A = B rig rate', lo, 159.6, 0.2); }

// every target reachable with the controls on the page
const sizes = []; for (let i = 8; i <= 24; i++) sizes.push(i);
const combos = []; for (const i of sizes) for (const j of sizes) if (j >= i) for (const k of sizes) if (k >= j) combos.push([i, j, k]);
yes('target 2 reachable', combos.some(c => { const d = P.state(400, 12, c).dp; return d >= 600 && d <= 800; }));
let t3 = 0; for (let q = 0; q <= 800; q += 10) for (const c of combos) if (Math.abs(P.state(q, 10, c).Fj - 820) <= 0.02 * 820) t3++;
yes('target 3 reachable', t3 > 0);
const t4 = combos.filter(c => Math.abs(P.state(300, 12, c).vn - 400) <= 12); yes('target 4 reachable', t4.length > 0);
const t5 = combos.filter(c => { const p = w.pd(650) + P.dpBit(9.6, 650, P.nozArea(c)); return p >= 2900 && p <= 3000; }); yes('nozzle target reachable', t5.length > 0);
console.log('target 4 answers', t4.map(c => c.join('-')).join(' '), '| nozzle answers', t5.map(c => c.join('-')).join(' '), '| target 3 ways', t3);
console.log(bad ? bad + ' FAILED of ' + n : 'all ' + n + ' checks pass');
process.exit(bad ? 1 : 0);
