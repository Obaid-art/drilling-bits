/* scene.js — the 3D picture: a block of rock cut through the middle of the hole, the drill collar cut open,
   an 8 1/2 in bit on bottom (a three-cone rolling cutter bit or a PDC drag bit), mud going down the bore,
   out of the nozzles and up the annulus with the cuttings. The same bit can be taken out and turned over.
   One scene unit is 4.25 in, so the bit's gauge radius is 1. Nozzles and pipe are drawn to that scale. */
import * as THREE from 'three';
import { createStage, clamp, ease } from './kit.js?v=9';

const HDR = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/equirectangular/royal_esplanade_1k.hdr';
const AL = 35 * Math.PI / 180, SA = Math.sin(AL), CA = Math.cos(AL), TA = Math.tan(AL);
export const GEOM = { bit: 8.5, collarOD: 6.5, collarID: 2.8125 };          // inches
const RH = 1.02, RCO = GEOM.collarOD / GEOM.bit, RCI = GEOM.collarID / GEOM.bit;
const XW = 7.5, ZD = 4.2, YB = -2.8, YM = 2.7, TOP = 10, YC = 2.02;

export function createScene(canvas, labelBox, S) {
  const stage = createStage(canvas, labelBox, { fov: 28, exposure: 1.0, drift: 0.18, hdri: HDR });
  const { scene } = stage;
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(5, 11, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 8, bottom: -4, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.3));

  const loader = new THREE.TextureLoader(); let pending = 0;
  const texture = (file, rep, srgb) => { pending++; const t = loader.load('tex/' + file + '.jpg', () => { pending--; stage.draw(); }, undefined, () => { pending--; }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const rock = (name, rep, tint) => { const arm = texture(name + '_arm', rep); return new THREE.MeshStandardMaterial({ map: texture(name + '_diff', rep, true), normalMap: texture(name + '_nor', rep), roughnessMap: arm, aoMap: arm, roughness: 1, metalness: 0, color: tint || 0xffffff, side: THREE.DoubleSide }); };
  const std = (color, roughness, metalness) => new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
  const M = {
    body: std(0x3f6396, 0.5, 0.3), cone: std(0x9a9fa6, 0.34, 0.95), tooth: std(0x6f747b, 0.48, 0.9), thread: std(0xb4b8be, 0.3, 1.0),
    matrix: std(0x4a5560, 0.55, 0.45), carbide: std(0x8a8d92, 0.3, 0.95), pcd: std(0x0c0c0f, 0.16, 0.5), dark: std(0x070708, 0.7, 0.1),
    collar: std(0x767b82, 0.42, 0.9), cut: std(0xb9bdc2, 0.5, 0.85), table: std(0xd8d4ca, 0.85, 0.0)
  };
  const V2 = (p) => new THREE.Vector2(p[0], p[1]);
  // a lathe with sharp edges: every inner point is doubled, so the two faces that meet there keep their own normals
  const lathe = (pts, sharp = true, seg = 64, a0 = 0, da = Math.PI * 2) => { const q = []; pts.forEach((p, i) => { q.push(V2(p)); if (sharp && i > 0 && i < pts.length - 1) q.push(V2(p)); }); return new THREE.LatheGeometry(q, seg, a0, da); };
  const mesh = (g, m, parent, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; if (parent) parent.add(o); return o; };

  // ---------- the two hole-bottom profiles (radius, height), from the centre to the wall ----------
  const pdcEnv = [[0, 0.17], [0.15, 0.15], [0.35, 0.07], [0.52, 0.012], [0.62, 0], [0.74, 0.035], [0.86, 0.13], [0.94, 0.27], [0.985, 0.44], [1.0, 0.62]];
  const pdcCurve = new THREE.SplineCurve(pdcEnv.map(V2));
  const pdcPts = pdcCurve.getSpacedPoints(60).map(p => [p.x, p.y]);
  const PROF = { tri: [[0, 0], [RH, 0]], pdc: pdcPts.concat([[RH, 0.66]]) };
  const bottomY = (kind, r) => { if (kind === 'tri') return 0; const p = PROF.pdc; for (let i = 1; i < p.length; i++) if (r <= p[i][0]) { const f = (r - p[i - 1][0]) / Math.max(1e-6, p[i][0] - p[i - 1][0]); return p[i - 1][1] + f * (p[i][1] - p[i - 1][1]); } return 0.66; };

  // ---------- the rock, the collar and the mud: everything that belongs to the hole ----------
  const holeG = new THREE.Group(), studioG = new THREE.Group(); scene.add(holeG, studioG);
  const upper = rock('rock_face_03', 0.2, 0xe9e2d6), lower = rock('dark_rock_02', 0.22, 0xd8d2ca), wallM = rock('dark_rock_02', 0.5, 0x8d8378);
  const holeVar = {};
  for (const kind of ['tri', 'pdc']) {
    const g = new THREE.Group(), p = PROF[kind];
    const s = new THREE.Shape(); s.moveTo(-XW, YB); s.lineTo(XW, YB); s.lineTo(XW, YM); s.lineTo(RH, YM);
    for (let i = p.length - 1; i >= 0; i--) s.lineTo(p[i][0], p[i][1]);
    for (let i = 1; i < p.length; i++) s.lineTo(-p[i][0], p[i][1]);
    s.lineTo(-RH, YM); s.lineTo(-XW, YM); s.closePath();
    mesh(new THREE.ShapeGeometry(s), lower, g, false);
    mesh(lathe(p.concat([[RH, TOP]]), kind === 'tri', 56, Math.PI / 2, Math.PI), wallM, g, false);
    // the mud that fills the hole, seen where the cut passes through it
    const f = new THREE.Shape(); f.moveTo(-RH, TOP); for (let i = p.length - 1; i >= 1; i--) f.lineTo(-p[i][0], p[i][1]); for (let i = 0; i < p.length; i++) f.lineTo(p[i][0], p[i][1]); f.lineTo(RH, TOP); f.closePath();
    g.userData.mudGeo = new THREE.ShapeGeometry(f);
    holeG.add(g); holeVar[kind] = g;
  }
  for (const sg of [-1, 1]) { const s = new THREE.Shape(); s.moveTo(sg * RH, YM); s.lineTo(sg * XW, YM); s.lineTo(sg * XW, TOP); s.lineTo(sg * RH, TOP); s.closePath(); mesh(new THREE.ShapeGeometry(s), upper, holeG, false); }
  { const s = new THREE.Shape(); s.moveTo(-XW, 0); s.lineTo(-RH, 0); s.absarc(0, 0, RH, Math.PI, 0, true); s.lineTo(XW, 0); s.lineTo(XW, ZD); s.lineTo(-XW, ZD); s.closePath(); const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.translate(0, TOP, 0); mesh(g, upper, holeG, false); }
  for (const sg of [-1, 1]) { const g1 = new THREE.PlaneGeometry(ZD, TOP - YM); g1.rotateY(sg * Math.PI / 2); g1.translate(sg * XW, (TOP + YM) / 2, -ZD / 2); mesh(g1, upper, holeG, false); const g2 = new THREE.PlaneGeometry(ZD, YM - YB); g2.rotateY(sg * Math.PI / 2); g2.translate(sg * XW, (YM + YB) / 2, -ZD / 2); mesh(g2, lower, holeG, false); }
  { const line = mesh(new THREE.PlaneGeometry(2 * XW, 0.035), new THREE.MeshBasicMaterial({ color: 0x2a2520, transparent: true, opacity: 0.55 }), holeG, false); line.position.set(0, YM, 0.004); }

  // the drill collar, cut open: only the half behind the cut is drawn
  const HC = TOP + 3 - YC;
  { const o = new THREE.CylinderGeometry(RCO, RCO, HC, 56, 1, true, Math.PI / 2, Math.PI); o.translate(0, YC + HC / 2, 0); mesh(o, M.collar, holeG);
    const i = new THREE.CylinderGeometry(RCI, RCI, HC, 40, 1, true, Math.PI / 2, Math.PI); i.translate(0, YC + HC / 2, 0); mesh(i, M.collar, holeG, false);
    const r = new THREE.RingGeometry(RCI, RCO, 48, 1, Math.PI, Math.PI); r.rotateX(Math.PI / 2); r.translate(0, YC, 0); mesh(r, M.collar, holeG, false);
    for (const sg of [-1, 1]) { const c = new THREE.PlaneGeometry(RCO - RCI, HC); c.translate(sg * (RCO + RCI) / 2, YC + HC / 2, 0.003); mesh(c, M.cut, holeG, false); } }

  const HASH = 'float h1(float x){ return fract(sin(x*127.1)*43758.5453); }';
  const mudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
    uniforms: { uUp: { value: 0 }, uDown: { value: 0 }, uRci: { value: RCI }, uYc: { value: YC + 0.28 }, uCol: { value: new THREE.Color(0.56, 0.47, 0.36) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: HASH + ` varying vec2 vP; uniform float uUp, uDown, uRci, uYc; uniform vec3 uCol;
      void main(){ bool bore = abs(vP.x) < uRci && vP.y > uYc; float lane = floor(vP.x * 26.0);
        float ph = bore ? (vP.y * 0.8 + uDown) : (vP.y * 0.8 - uUp); float s = fract(ph + h1(lane) * 7.0);
        float k = smoothstep(0.0, 0.3, s) * smoothstep(0.95, 0.5, s);
        gl_FragColor = vec4(mix(uCol * 0.82, uCol * 1.22, k), bore ? 0.96 : 0.7 + 0.2 * k); }`
  });
  const mudFace = new THREE.Mesh(holeVar.tri.userData.mudGeo, mudMat); mudFace.position.z = -0.004; mudFace.renderOrder = 1; holeG.add(mudFace);

  // ---------- the bit ----------
  const bit = new THREE.Group(), spin = new THREE.Group(); bit.add(spin); scene.add(bit);
  const tri = new THREE.Group(), pdc = new THREE.Group(); spin.add(tri, pdc);

  // the shank and the API pin (tapered thread) are the same on both bits
  function pinAndShank(parent, bodyMat, y0) {
    const pts = [[0.62, y0 - 0.5], [0.62, y0], [0.5, y0]]; let y = y0 + 0.03, r = 0.485;
    for (let i = 0; i < 10; i++) { pts.push([r, y], [r - 0.024, y + 0.021]); y += 0.042; r -= 0.011; }
    pts.push([r, y], [0.2, y], [0.2, y - 0.35]);
    mesh(lathe(pts.slice(0, 2)), bodyMat, parent); mesh(lathe(pts.slice(1)), M.thread, parent);
    for (const a of [0, Math.PI]) { const b = mesh(new THREE.BoxGeometry(0.34, 0.2, 0.06), M.dark, parent, false); b.position.set(Math.cos(a) * 0.615, y0 - 0.25, Math.sin(a) * 0.615); b.rotation.y = Math.PI / 2 - a; }   // breaker slots
  }
  const nozzles = { tri: [], pdc: [] };
  function nozzle(parent, kind, r, y, azDeg, yEnd) {
    const a = azDeg * Math.PI / 180, g = new THREE.Group(); g.position.set(r * Math.cos(a), y, r * Math.sin(a)); parent.add(g);
    const ring = mesh(lathe([[0.03, 0.0], [0.092, 0.0], [0.092, 0.05], [0.03, 0.05]]), M.carbide, g); ring.position.y = -0.002;
    const hole = mesh(new THREE.CircleGeometry(1, 28), M.dark, g, false); hole.rotation.x = Math.PI / 2; hole.position.y = -0.004;
    nozzles[kind].push({ g, hole, r, y, a, len: y - yEnd });
  }

  // --- the rolling cutter bit: three legs, each carrying a cone on a journal that points down and in ---
  { mesh(lathe([[0, 0.98], [0.5, 1.03], [0.8, 1.22], [0.84, 1.48], [0.74, 1.6], [0.62, 1.66]]), M.body, tri); pinAndShank(tri, M.body, 2.0);
    const rowsOf = [[0.25, 0.42, 0.6, 0.775], [0.33, 0.51, 0.66, 0.775], [0.29, 0.47, 0.63, 0.775]], LW = 58 * Math.PI / 180;
    const tooth = new THREE.CylinderGeometry(0.02, 0.058, 0.1, 4, 1); tooth.rotateY(Math.PI / 4);
    const legPts = [[0.92, 1.55], [0.985, 1.42], [0.985, 0.44], [0.965, 0.36], [0.44, 0.93], [0.42, 1.3], [0.92, 1.55]];
    const tipPts = [[0.985, 0.5], [0.985, 0.24], [0.972, 0.17], [0.46, 0.9], [0.46, 1.0], [0.985, 0.5]], TW = 32 * Math.PI / 180, tipShape = new THREE.Shape(tipPts.map(V2));   // the shirttail narrows towards its tip
    const legShape = new THREE.Shape(legPts.map(V2));
    tri.userData.cones = [];
    for (let k = 0; k < 3; k++) {
      const leg = new THREE.Group(); leg.rotation.y = -k * 2 * Math.PI / 3; tri.add(leg);
      mesh(lathe(legPts, true, 20, Math.PI / 2 - LW / 2, LW), M.body, leg);
      for (const sg of [-1, 1]) { const c = mesh(new THREE.ShapeGeometry(legShape), M.body, leg); c.rotation.y = sg * LW / 2; }
      mesh(lathe(tipPts, true, 12, Math.PI / 2 - TW / 2, TW), M.body, leg);
      for (const sg of [-1, 1]) { const c = mesh(new THREE.ShapeGeometry(tipShape), M.body, leg); c.rotation.y = sg * TW / 2; }
      const cone = new THREE.Group(); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(CA, SA, 0)); leg.add(cone);
      const spinner = new THREE.Group(); cone.add(spinner); tri.userData.cones.push(spinner);
      const rb = (s) => TA * s - 0.104;
      mesh(lathe([[0, 0.16], [0.03, 0.19], [rb(0.8), 0.8], [0.5, 0.84], [0.47, 0.875], [0, 0.875]], true, 48), M.cone, spinner);
      const rows = rowsOf[k], list = [];
      rows.forEach((s, ri) => { const r = rb(s), n = Math.max(4, Math.round(2 * Math.PI * r / 0.125)); for (let i = 0; i < n; i++) list.push([s, r, (i + (ri % 2) * 0.5) / n * 2 * Math.PI]); });
      const im = new THREE.InstancedMesh(tooth, M.tooth, list.length); im.castShadow = true; const m4 = new THREE.Matrix4();
      list.forEach(([s, r, psi], i) => {
        const er = new THREE.Vector3(Math.cos(psi), 0, Math.sin(psi)), ey = new THREE.Vector3(0, 1, 0), c = new THREE.Vector3(-Math.sin(psi), 0, Math.cos(psi));
        const nrm = er.clone().multiplyScalar(CA).addScaledVector(ey, -SA), gen = er.clone().multiplyScalar(SA).addScaledVector(ey, CA);
        const pos = er.clone().multiplyScalar(r).addScaledVector(ey, s).addScaledVector(nrm, 0.036);
        m4.makeBasis(gen.multiplyScalar(1.55), nrm, c.multiplyScalar(-0.7)); m4.setPosition(pos); im.setMatrixAt(i, m4);
      });
      spinner.add(im);
      // the nozzle boss sits between two legs
      const az = k * 120 + 60, a = az * Math.PI / 180, boss = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.42, 24), M.body, tri); boss.position.set(0.64 * Math.cos(a), 1.12, 0.64 * Math.sin(a));
      nozzle(tri, 'tri', 0.64, 0.9, az, 0);
    }
  }

  // --- the PDC bit: one piece, no moving parts; blades carry the cutters, the gaps between blades are the junk slots ---
  { mesh(lathe([[0, 0.34], [0.3, 0.27], [0.5, 0.2], [0.66, 0.21], [0.78, 0.33], [0.84, 0.5], [0.86, 0.7], [0.86, 1.25], [0.76, 1.42], [0.62, 1.5]], false), M.matrix, pdc); pinAndShank(pdc, M.matrix, 2.0);
    const T = 0.2, RC = 0.074, LC = 0.13, BR = 18 * Math.PI / 180, EXP = 0.03;
    const cyl = new THREE.CylinderGeometry(RC, RC, LC, 28), tab = new THREE.CylinderGeometry(RC, RC, 0.02, 28), pad = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16);
    const fine = pdcCurve.getSpacedPoints(200);
    for (let k = 0; k < 6; k++) {
      const long = k % 2 === 0, r0 = long ? 0.13 : 0.44, blade = new THREE.Group(); blade.rotation.y = -k * Math.PI / 3; pdc.add(blade);
      const pts = []; fine.forEach((p, i) => { if (p.x < r0) return; const t = pdcCurve.getTangentAt(i / 200), nx = t.y, ny = -t.x; pts.push([p.x - nx * EXP, p.y - ny * EXP]); });
      pts.push([0.97, 1.2], [0.9, 1.34], [0.8, 1.37], [0.7, 1.2], [0.7, 0.5], [0.55, 0.36], [r0, 0.36]);
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(V2)), { depth: T - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 4 }); g.translate(0, 0, -T / 2 + 0.015);
      mesh(g, M.matrix, blade);
      // cutters along the leading edge, from the cone of the bit out to the shoulder; the face leans back by the back rake angle
      const total = pdcCurve.getLength(); const u0 = fine.findIndex(p => p.x >= r0 + 0.07) / 200;
      for (let u = u0 + (long ? 0 : 0.02); u <= 0.985; u += 0.158 / total) {
        const p = pdcCurve.getPointAt(Math.min(1, u)), t = pdcCurve.getTangentAt(Math.min(1, u)), n = new THREE.Vector3(t.y, -t.x, 0);
        const d = new THREE.Vector3(0, 0, Math.cos(BR)).addScaledVector(n, Math.sin(BR)).normalize();
        const F = new THREE.Vector3(p.x, p.y, T / 2 + 0.012).addScaledVector(n, -RC * Math.cos(BR));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        const c = mesh(cyl, M.carbide, blade); c.quaternion.copy(q); c.position.copy(F).addScaledVector(d, -LC / 2 - 0.02);
        const f = mesh(tab, M.pcd, blade); f.quaternion.copy(q); f.position.copy(F).addScaledVector(d, -0.01);
      }
      for (const y of [0.78, 0.94, 1.1]) { const b = mesh(pad, M.carbide, blade); b.rotation.z = Math.PI / 2; b.position.set(0.972, y, 0.0); }   // gauge inserts
      if (!long) nozzle(pdc, 'pdc', 0.27, 0.262, k * 60, bottomY('pdc', 0.27));
    }
  }
  bit.traverse(o => { if (o.isMesh && o.material !== M.dark) { o.castShadow = true; o.receiveShadow = true; } });

  // ---------- jets: drawn to scale, one per nozzle, from the nozzle to the hole bottom ----------
  const jetGeo = new THREE.CylinderGeometry(1, 2.3, 1, 18, 1, true); jetGeo.translate(0, -0.5, 0);
  const jetMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uPhase: { value: 0 }, uAlpha: { value: 1 }, uCol: { value: new THREE.Color(0.62, 0.52, 0.38) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: HASH + ` varying vec2 vUv; uniform float uPhase, uAlpha; uniform vec3 uCol;
      void main(){ float lane = floor(vUv.x * 12.0); float s = fract(vUv.y * 1.6 + uPhase * (0.8 + 0.4 * h1(lane)) + h1(lane + 3.0));
        float k = smoothstep(0.0, 0.25, s) * smoothstep(0.8, 0.4, s); gl_FragColor = vec4(mix(uCol * 0.8, uCol * 1.25, k), uAlpha * (0.6 + 0.4 * k)); }`
  });
  const splashGeo = new THREE.RingGeometry(0.02, 1, 28); splashGeo.rotateX(-Math.PI / 2);
  for (const kind of ['tri', 'pdc']) nozzles[kind].forEach(nz => {
    nz.jet = new THREE.Mesh(jetGeo, jetMat()); nz.jet.renderOrder = 2; nz.g.add(nz.jet);
    nz.splash = new THREE.Mesh(splashGeo, new THREE.MeshBasicMaterial({ color: 0x9c8562, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })); nz.splash.position.y = -nz.len + 0.012; nz.splash.renderOrder = 2; nz.g.add(nz.splash);
  });

  // ---------- cuttings: chips leave the bottom, pass the bit at the wall and climb the annulus ----------
  const NCH = 150, chipGeo = new THREE.IcosahedronGeometry(0.034, 0), chips = new THREE.InstancedMesh(chipGeo, new THREE.MeshStandardMaterial({ color: 0x3d3833, roughness: 0.9, flatShading: true }), NCH); holeG.add(chips);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const CH = []; for (let i = 0; i < NCH; i++) CH.push({ sg: i % 2 ? 1 : -1, r: rnd(0.15, 0.95), y: 0, up: false, lane: rnd(0, 1), z: rnd(0.02, 0.09), rot: rnd(0, 6), sc: [rnd(0.6, 1.5), rnd(0.35, 0.8), rnd(0.6, 1.3)], slip: rnd(0.75, 1) });
  CH.forEach((c, i) => { if (i % 3) { c.up = true; c.y = rnd(0.3, TOP); } });
  const dummy = new THREE.Object3D();

  // ---------- the bench the bit stands on when it is out of the hole ----------
  { const t = mesh(new THREE.CylinderGeometry(3.3, 3.4, 0.14, 72), M.table, studioG, false); t.position.y = -0.07; }

  // ---------- state the page drives ----------
  const vis = (v) => v > 0 ? 0.34 * Math.sqrt(v) : 0;      // picture speed (units/s) for a real speed in ft/s; compressed so jets and annulus can be seen together
  let flip = 0, shownBit = null, shownMode = null;
  function apply() {
    if (shownBit !== S.bit) { shownBit = S.bit; tri.visible = S.bit === 'tri'; pdc.visible = S.bit === 'pdc'; holeVar.tri.visible = S.bit === 'tri'; holeVar.pdc.visible = S.bit === 'pdc'; mudFace.geometry = holeVar[S.bit].userData.mudGeo; CH.forEach(c => { if (!c.up) c.y = bottomY(S.bit, c.r) + 0.03; }); }
    if (shownMode !== S.mode) { shownMode = S.mode; holeG.visible = S.mode === 'hole'; studioG.visible = S.mode === 'studio'; }
  }
  stage.onUpdate((dt) => {
    apply();
    const want = S.mode === 'studio' && S.flip ? 1 : 0; flip = clamp(flip + Math.sign(want - flip) * dt / 2.2, 0, 1); const e = ease(flip);
    bit.rotation.x = Math.PI * e; bit.position.y = 2.52 * e;
    const turning = S.mode === 'hole' && S.turn !== false, w = turning ? 2 * Math.PI / (S.slow || 9) : 0;
    spin.rotation.y -= w * dt; tri.userData.cones.forEach(c => { c.rotation.y += w / SA * dt; });
    const vj = vis(S.vn), va = vis(S.va), vp = vis(S.vp);
    mudMat.uniforms.uUp.value += va * dt * 0.8; mudMat.uniforms.uDown.value += vp * dt * 0.8;
    const showJets = S.mode === 'hole' && S.q > 0;
    nozzles[S.bit].forEach((nz, i) => {
      const rn = (S.noz[i] / 64) / (GEOM.bit / 2);                                   // nozzle radius in scene units, to scale
      nz.hole.scale.setScalar(rn); nz.jet.visible = nz.splash.visible = showJets;
      nz.jet.scale.set(rn, nz.len, rn); nz.jet.material.uniforms.uPhase.value += vj * dt / Math.max(0.2, nz.len) * 0.6;
      nz.splash.scale.setScalar(rn * 4.2);
    });
    // chips
    const kind = S.bit;
    for (let i = 0; i < NCH; i++) {
      const c = CH[i];
      if (S.mode === 'hole') {
        if (!c.up) { c.r += vj * 0.07 * dt * (0.5 + c.lane); c.y = bottomY(kind, Math.min(c.r, 1)) + 0.03; if (c.r >= 0.985) { c.r = 0.985; c.up = true; } }
        else { c.y += va * c.slip * dt; if (c.y > TOP - 0.2) { c.up = false; c.r = rnd(0.12, 0.8); c.y = bottomY(kind, c.r) + 0.03; } }
      }
      const xa = 0.975 + 0.03 * c.lane, xb = RCO + 0.04 + c.lane * (RH - RCO - 0.08), f = clamp((c.y - 1.9) / 0.8, 0, 1), x = c.up ? xa + (xb - xa) * f * f * (3 - 2 * f) : c.r;
      dummy.position.set(c.sg * x, c.y, c.z); dummy.rotation.set(c.rot, c.rot * 1.7 + c.y * 0.6, c.rot * 0.6); dummy.scale.set(c.sc[0], c.sc[1], c.sc[2]); dummy.updateMatrix(); chips.setMatrixAt(i, dummy.matrix);
    }
    chips.instanceMatrix.needsUpdate = true;
  });

  // ---------- where things are, for labels ----------
  const tmp = new THREE.Vector3(), best = new THREE.Vector3();
  // a point on the bit given by radius, height and azimuth; of its copies around the bit, the one nearest the camera
  const onBit = (r, y, az0, copies) => () => { let d = Infinity; for (let k = 0; k < copies; k++) { const a = (az0 + k * 360 / copies) * Math.PI / 180; tmp.set(r * Math.cos(a), y, r * Math.sin(a)); spin.localToWorld(tmp); const dd = tmp.distanceToSquared(stage.camera.position); if (dd < d) { d = dd; best.copy(tmp); } } return best.clone(); };
  const fixed = (x, y, z) => { const v = new THREE.Vector3(x, y, z); return () => v; };
  const cams = {
    hole: { az: 90, el: 9, dist: 17.5, tx: 0, ty: 3.3, tz: 0 },
    bottom: { az: 78, el: 10, dist: 8.2, tx: 0, ty: 1.0, tz: 0 },
    jets: { az: 90, el: 5, dist: 6.2, tx: 0, ty: 0.75, tz: 0 },
    studio: { az: 62, el: 14, dist: 10.5, tx: 0, ty: 1.2, tz: 0 },
    face: { az: 62, el: 40, dist: 11.5, tx: 0, ty: 1.45, tz: 0 }
  };
  const bitBox = (project) => {   // the part of the picture labels must stay off: the bit itself
    const pts = []; for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) for (const y of [0.1, 2.4]) { tmp.set(x, y, z); const p = project(tmp); if (p) pts.push(p); }
    if (pts.length < 4) return []; const xs = pts.map(p => p.x), ys = pts.map(p => p.y); return [{ x0: Math.min(...xs) + 6, y0: Math.min(...ys) + 6, x1: Math.max(...xs) - 6, y1: Math.max(...ys) - 6 }];
  };
  return { stage, cams, bitBox, onBit, fixed, bottomY, vis, get flip() { return flip; }, get pending() { return pending; }, RCO, RCI, RH, YC };
}
