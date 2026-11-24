/* physics.js — jet bit hydraulics and drilling cost, in field units, from Bourgoyne, Millheim, Chenevert and Young,
   Applied Drilling Engineering (SPE Textbook Series vol. 2). Equation numbers are the book's.
   q gal/min, rho lbm/gal, areas sq in, pressures psi, velocities ft/s, power hp, force lbf. */
export const CD = 0.95;                                                                   // discharge coefficient recommended in the book
export const nozArea = (list) => list.reduce((s, n) => s + Math.PI / 4 * (n / 32) * (n / 32), 0);   // nozzle sizes are given in 32nds of an inch
export const vNozzle = (q, At) => At > 0 ? q / (3.117 * At) : 0;                            // Eq. 4.33
export const dpBit = (rho, q, At, Cd = CD) => 8.311e-5 * rho * q * q / (Cd * Cd * At * At); // Eq. 4.34
export const hhp = (dp, q) => dp * q / 1714;                                                // Eq. 4.35
export const impact = (rho, q, dp, Cd = CD) => 0.01823 * Cd * q * Math.sqrt(rho * dp);      // Eq. 4.37
export const areaFor = (rho, q, dp, Cd = CD) => Math.sqrt(8.311e-5 * rho * q * q / (Cd * Cd * dp));   // Eq. 4.85
export const qMax = (hp, E, pmax) => 1714 * hp * E / pmax;                                  // Eq. 4.83
export const vPipe = (q, d) => q / (2.448 * d * d);                                         // mean velocity in a pipe of inside diameter d, in
export const vAnnulus = (q, d2, d1) => q / (2.448 * (d2 * d2 - d1 * d1));                   // mean velocity in an annulus
export const fitM = (q1, pd1, q2, pd2) => Math.log(pd1 / pd2) / Math.log(q1 / q2);          // slope of parasitic loss against rate on log-log paper
export const cost = (Cb, Cr, tb, tc, tt, dD) => (Cb + Cr * (tb + tc + tt)) / dD;            // Eq. 1.16, $/ft

export function state(q, rho, noz) {
  const At = nozArea(noz), dp = dpBit(rho, q, At);
  return { At, vn: vNozzle(q, At), dp, hp: hhp(dp, q), Fj: impact(rho, q, dp) };
}

// Example 4.31: the pump, the well, and the two pressure readings taken with the bit now in the hole.
export const EX431 = { rho: 9.6, noz: [12, 12, 12], q1: 485, p1: 2800, q2: 247, p2: 900, hp: 1250, E: 0.91, pmax: 3000, qmin: 225 };
export function well431(mult = 1) {
  const X = EX431, At = nozArea(X.noz);
  const pb1 = dpBit(X.rho, X.q1, At), pb2 = dpBit(X.rho, X.q2, At), pd1 = X.p1 - pb1, pd2 = X.p2 - pb2;
  const m = fitM(X.q1, pd1, X.q2, pd2), c = mult * pd1 / Math.pow(X.q1, m), qmax = qMax(X.hp, X.E, X.pmax);
  const pd = (q) => c * Math.pow(q, m);
  const at = (q) => { const d = pd(q), b = Math.max(0, X.pmax - d); return { pd: d, pb: b, hp: hhp(b, q), Fj: impact(X.rho, q, b), At: b > 0 ? areaFor(X.rho, q, b) : Infinity }; };
  // the rate at which the parasitic loss is the stated fraction of the pump pressure, then held inside the pump's limits
  const qAt = (frac) => Math.pow(frac * X.pmax / c, 1 / m);
  const best = (crit) => { const free = qAt(crit === 'hp' ? 1 / (m + 1) : 2 / (m + 2)); return { free, q: Math.min(qmax, Math.max(X.qmin, free)) }; };
  return { X, pb1, pb2, pd1, pd2, m, c, qmax, pd, at, best };
}

// Example 1.5: three bits in a thick limestone at 9,000 ft. Rig $400/hr, trip 7 hr.
export const BITS15 = [
  { name: 'A', Cb: 800, tb: 14.8, tc: 0.1, rop: 13.8 },
  { name: 'B', Cb: 4900, tb: 57.7, tc: 0.4, rop: 12.6 },
  { name: 'C', Cb: 4500, tb: 95.8, tc: 0.5, rop: 10.2 }
];
export const cost15 = (b, Cr, tt) => cost(b.Cb, Cr, b.tb, b.tc, tt, b.rop * b.tb);
