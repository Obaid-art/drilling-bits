/* scene.js — the 3D picture: a block of rock cut through the middle of the hole, the drill collar cut open,
   an 8 1/2 in bit on bottom (a three-cone rolling cutter bit or a PDC drag bit), mud going down the bore,
   out of the nozzles and up the annulus with the cuttings. The same bit can be taken out and turned over.
   One scene unit is 4.25 in, so the bit's gauge radius is 1. Nozzles and pipe are drawn to that scale. */
import * as THREE from 'three';
import { createStage, clamp, ease } from './kit.js?v=17';

const HDR = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/equirectangular/royal_esplanade_1k.hdr';
const AL = 35 * Math.PI / 180, SA = Math.sin(AL), CA = Math.cos(AL), TA = Math.tan(AL);
export const GEOM = { bit: 8.5, collarOD: 6.5, collarID: 2.8125 };          // inches
const RH = 1.02, RCO = GEOM.collarOD / GEOM.bit, RCI = GEOM.collarID / GEOM.bit;
const XW = 7.5, ZD = 4.2, YB = -8, YM = 2.7, TOP = 13.5, YC = 2.02, DMAX = 2.6, ZF = 2.8;

export function createScene(canvas, labelBox, S) {
  const stage = createStage(canvas, labelBox, { fov: 28, exposure: 1.0, drift: 0.18, hdri: HDR });
  const { scene } = stage;
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); sun.position.set(5, 11, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 8, bottom: -9, near: 1, far: 44 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.3));

  const loader = new THREE.TextureLoader(); let pending = 0;
  const texture = (file, rep, srgb) => { pending++; const t = loader.load('tex/' + file + '.jpg', () => { pending--; stage.draw(); }, undefined, () => { pending--; }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const rock = (name, rep, tint) => { const arm = texture(name + '_arm', rep); return new THREE.MeshStandardMaterial({ map: texture(name + '_diff', rep, true), normalMap: texture(name + '_nor', rep), roughnessMap: arm, aoMap: arm, roughness: 1, metalness: 0, color: tint || 0xffffff, side: THREE.DoubleSide }); };
  const std = (color, roughness, metalness) => new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
  const M = {
    body: std(0x35588a, 0.46, 0.4), cone: std(0x9a9fa6, 0.34, 0.95), tooth: std(0x6f747b, 0.48, 0.9), thread: std(0xb4b8be, 0.3, 1.0),
    matrix: std(0x4a5560, 0.55, 0.45), carbide: std(0x8a8d92, 0.3, 0.95), nozzle: std(0x3a3c40, 0.32, 0.9), pcd: std(0x0c0c0f, 0.16, 0.5), dark: std(0x070708, 0.7, 0.1),
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

  // ---------- the rock, which stays still, and everything that goes down with the bit ----------
  const holeG = new THREE.Group(), studioG = new THREE.Group(), asm = new THREE.Group(); scene.add(holeG, studioG); holeG.add(asm);
  const upper = rock('rock_face_03', 0.2, 0xe9e2d6), lower = rock('dark_rock_02', 0.22, 0xd8d2ca), wallM = rock('dark_rock_02', 0.5, 0x8d8378);
  // In front of the cut the rock is left whole below the hole bottom, so the bit stands on the floor it is cutting.
  // That floor goes down as the hole deepens: the still rock in front is clipped at the level of the hole bottom.
  stage.renderer.localClippingEnabled = true;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), lowerClip = lower.clone(); lowerClip.clippingPlanes = [floorPlane];
  const rect = (x0, y0, x1, y1) => { const q = new THREE.Shape(); q.moveTo(x0, y0); q.lineTo(x1, y0); q.lineTo(x1, y1); q.lineTo(x0, y1); q.closePath(); return q; };
  { const q = new THREE.Shape(), nb = -DMAX - 0.4; q.moveTo(-XW, YB); q.lineTo(XW, YB); q.lineTo(XW, YM); q.lineTo(RH, YM); q.lineTo(RH, nb); q.lineTo(-RH, nb); q.lineTo(-RH, YM); q.lineTo(-XW, YM); q.closePath();
    mesh(new THREE.ShapeGeometry(q), lower, holeG, false);
    mesh(lathe([[RH, nb], [RH, TOP]], false, 56, Math.PI / 2, Math.PI), wallM, holeG, false);
    const fg = new THREE.ShapeGeometry(rect(-XW, YB, XW, 0)); fg.translate(0, 0, ZF); mesh(fg, lowerClip, holeG, false);
    for (const sg of [-1, 1]) { const sd = new THREE.PlaneGeometry(ZF, -YB); sd.rotateY(sg * Math.PI / 2); sd.translate(sg * XW, YB / 2, ZF / 2); mesh(sd, lowerClip, holeG, false); } }
  for (const sg of [-1, 1]) mesh(new THREE.ShapeGeometry(rect(Math.min(sg * RH, sg * XW), YM, Math.max(sg * RH, sg * XW), TOP)), upper, holeG, false);
  { const q = new THREE.Shape(); q.moveTo(-XW, 0); q.lineTo(-RH, 0); q.absarc(0, 0, RH, Math.PI, 0, true); q.lineTo(XW, 0); q.lineTo(XW, ZD); q.lineTo(-XW, ZD); q.closePath(); const g = new THREE.ShapeGeometry(q); g.rotateX(-Math.PI / 2); g.translate(0, TOP, 0); mesh(g, upper, holeG, false); }
  for (const sg of [-1, 1]) { const g1 = new THREE.PlaneGeometry(ZD, TOP - YM); g1.rotateY(sg * Math.PI / 2); g1.translate(sg * XW, (TOP + YM) / 2, -ZD / 2); mesh(g1, upper, holeG, false); const g2 = new THREE.PlaneGeometry(ZD, YM - YB); g2.rotateY(sg * Math.PI / 2); g2.translate(sg * XW, (YM + YB) / 2, -ZD / 2); mesh(g2, lower, holeG, false); }
  { const line = mesh(new THREE.PlaneGeometry(2 * XW, 0.035), new THREE.MeshBasicMaterial({ color: 0x2a2520, transparent: true, opacity: 0.55 }), holeG, false); line.position.set(0, YM, 0.004); }

  // what moves down with the bit: the floor, the hole bottom, the pipe, the mud and the cuttings
  { const q = rect(-XW, -RH - 0.03, XW, ZF), hp = new THREE.Path(); hp.absarc(0, 0, RH, 0, Math.PI * 2, true); q.holes.push(hp); const tg = new THREE.ShapeGeometry(q, 48); tg.rotateX(Math.PI / 2); mesh(tg, lower, asm, false); }
  // The hole bottom is real relief in the same rock. Under a rolling cutter bit: a ring of craters for every row of teeth,
  // each crater the shape of a chisel tooth pressed in. Under a PDC bit: the smooth concentric grooves the cutters leave.
  const floorMat = lower.clone(); floorMat.vertexColors = true;
  let seed = 11; const rn = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const rowsR = [0.25, 0.29, 0.33, 0.42, 0.47, 0.51, 0.6, 0.63, 0.66, 0.775].map(sr => sr / CA);
  const craters = rowsR.map(R => { const n = Math.max(6, Math.round(2 * Math.PI * R / 0.125)), list = []; for (let i = 0; i < n; i++) list.push({ a: (i + rn() * 0.45) / n * 2 * Math.PI, R: R + (rn() - 0.5) * 0.02, d: 0.035 + rn() * 0.03 }); return { R, list }; });
  const heightOf = { tri: (r, a) => { let h = 0; for (const row of craters) { if (Math.abs(r - row.R) > 0.16) continue; for (const c of row.list) { let da = Math.abs(a - c.a); if (da > Math.PI) da = 2 * Math.PI - da; const t = r * da; if (t > 0.1) continue; const u = (r - c.R) / 0.058, v = t / 0.03, g = Math.exp(-(u * u + v * v)); h = Math.min(h, -c.d * g) + 0.012 * Math.exp(-((u * u + v * v) - 2.2) * ((u * u + v * v) - 2.2)) * 0.6; } } return h; },   // the pit, and a low rim of crushed rock round it
    pdc: (r) => -0.012 * (0.5 - 0.5 * Math.cos(2 * Math.PI * r / 0.04)) };
  const reliefDisc = (kind) => { const NR = 96, NS = 240, pos = [], uv = [], col = [], idx = [], hf = heightOf[kind];
    for (let i = 0; i <= NR; i++) { const r = RH * i / NR, edge = clamp((RH - r) / 0.05, 0, 1); for (let j = 0; j <= NS; j++) { const a = j / NS * 2 * Math.PI, x = r * Math.cos(a), z = r * Math.sin(a), h = (hf(r, a) + (rn() - 0.5) * 0.006) * edge; pos.push(x, h, z); uv.push(x, z); const sh = clamp(0.92 + h * 7, 0.5, 1.02); col.push(sh, sh, sh); } }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const p0 = i * (NS + 1) + j, p1 = p0 + 1, p2 = p0 + NS + 1, p3 = p2 + 1; idx.push(p0, p1, p2, p1, p3, p2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const holeVar = {};
  for (const kind of ['tri', 'pdc']) {
    const g = new THREE.Group(), p = PROF[kind]; asm.add(g); holeVar[kind] = g;
    mesh(reliefDisc(kind), floorMat, g, false);
    if (kind === 'pdc') {   // behind the cut the hole bottom has the shape of the bit's profile
      mesh(lathe(p, false, 56, Math.PI / 2, Math.PI), wallM, g, false);
      const q = new THREE.Shape(); q.moveTo(-RH, 0); q.lineTo(RH, 0); for (let i = p.length - 1; i >= 0; i--) q.lineTo(p[i][0], p[i][1]); for (let i = 1; i < p.length; i++) q.lineTo(-p[i][0], p[i][1]); q.closePath();
      const cap = mesh(new THREE.ShapeGeometry(q), lower, g, false); cap.position.z = 0.001;
    }
    // the mud that fills the hole, seen where the cut passes through it
    const f = new THREE.Shape(); f.moveTo(-RH, TOP); for (let i = p.length - 1; i >= 1; i--) f.lineTo(-p[i][0], p[i][1]); for (let i = 0; i < p.length; i++) f.lineTo(p[i][0], p[i][1]); f.lineTo(RH, TOP); f.closePath();
    g.userData.mudGeo = new THREE.ShapeGeometry(f);
  }

  // the drill collar: cut open to show the way the mud goes, or whole and turning with the bit
  const HC = TOP + 3 - YC;
  const cutG = new THREE.Group(), wholeG = new THREE.Group(), xrayG = new THREE.Group(); asm.add(cutG, wholeG, xrayG);
  { const o = new THREE.CylinderGeometry(RCO, RCO, HC, 56, 1, true, Math.PI / 2, Math.PI); o.translate(0, YC + HC / 2, 0); mesh(o, M.collar, cutG);
    const i = new THREE.CylinderGeometry(RCI, RCI, HC, 40, 1, true, Math.PI / 2, Math.PI); i.translate(0, YC + HC / 2, 0); mesh(i, M.collar, cutG, false);
    const r = new THREE.RingGeometry(RCI, RCO, 48, 1, Math.PI, Math.PI); r.rotateX(Math.PI / 2); r.translate(0, YC, 0); mesh(r, M.collar, cutG, false);
    for (const sg of [-1, 1]) { const c = new THREE.PlaneGeometry(RCO - RCI, HC); c.translate(sg * (RCO + RCI) / 2, YC + HC / 2, 0.003); mesh(c, M.cut, cutG, false); }
    // whole: a spiral drill collar, whose grooves let you see it turn
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d'); c.fillStyle = '#8b9097'; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = '#3c4046'; c.lineWidth = 30; c.lineCap = 'butt'; for (let k = -3; k < 6; k++) { c.beginPath(); c.moveTo(k * 512 / 3, 0); c.lineTo(k * 512 / 3 + 512, 512); c.stroke(); }
    const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, HC / 3.4); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    const w = new THREE.CylinderGeometry(RCO, RCO, HC, 64, 1, true); w.translate(0, YC + HC / 2, 0); const wm = new THREE.MeshStandardMaterial({ map: tx, bumpMap: tx, bumpScale: 2.5, roughness: 0.45, metalness: 0.8 }); mesh(w, wm, wholeG);
    // the same pipe made see-through, so the mud inside it can be watched in the round
    const xm = wm.clone(); xm.transparent = true; xm.opacity = 0.36; xm.depthWrite = false; const xr = mesh(w, xm, xrayG, false); xr.castShadow = false; xr.renderOrder = 2;
    const rr = new THREE.RingGeometry(RCI, RCO, 48); rr.rotateX(Math.PI / 2); rr.translate(0, YC, 0); mesh(rr, M.collar, wholeG, false); }

  const HASH = 'float h1(float x){ return fract(sin(x*127.1)*43758.5453); }';
  const mudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, side: THREE.DoubleSide,
    uniforms: { uUp: { value: 0 }, uDown: { value: 0 }, uRci: { value: RCI }, uYc: { value: YC }, uCol: { value: new THREE.Color(0.56, 0.47, 0.36) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: HASH + ` varying vec2 vP; uniform float uUp, uDown, uRci, uYc; uniform vec3 uCol;
      void main(){ gl_FragColor = vec4(uCol * (0.9 + 0.0 * (uUp + uDown + uRci + uYc)), 0.86); }`
  });
  const mudFace = new THREE.Mesh(holeVar.tri.userData.mudGeo, mudMat); mudFace.position.z = -0.004; mudFace.renderOrder = 1; asm.add(mudFace);

  // the mud in front of the cut: a thin, see-through column all round the bit and the pipe
  const colMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uUp: mudMat.uniforms.uUp, uCol: { value: new THREE.Color(0.56, 0.47, 0.36) } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: HASH + ` varying vec2 vUv; varying vec3 vN, vV; uniform float uUp; uniform vec3 uCol;
      void main(){ float edge = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float y = vUv.y * ${(TOP * 0.8).toFixed(2)} - uUp + 0.05 * sin(vUv.x * 37.7), s = fract(y * 0.62), k = smoothstep(0.0, 0.5, s) * smoothstep(1.0, 0.5, s);
        gl_FragColor = vec4(mix(uCol * 0.92, uCol * 1.16, k), 0.13 + 0.13 * k + 0.5 * edge); }`
  });
  { const g = new THREE.CylinderGeometry(RH - 0.004, RH - 0.004, TOP, 56, 1, true, -Math.PI / 2, Math.PI); g.translate(0, TOP / 2, 0); const m = new THREE.Mesh(g, colMat); m.renderOrder = 3; asm.add(m); }

  // inside the pipe: a solid column of mud whose bands travel downward to the bit
  { const coreMat = new THREE.ShaderMaterial({ uniforms: { uDown: mudMat.uniforms.uDown, uCol: { value: new THREE.Color(0.5, 0.41, 0.3) } },
      vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: ` varying vec3 vP; varying vec3 vN; uniform float uDown; uniform vec3 uCol;
        void main(){ float s = fract((vP.y * 0.8 + uDown) * 0.9), k = smoothstep(0.0, 0.5, s) * smoothstep(1.0, 0.5, s); float lit = 0.72 + 0.28 * max(0.0, normalize(vN).z * 0.6 + normalize(vN).y * 0.2 + 0.4);
          gl_FragColor = vec4(mix(uCol * 0.8, uCol * 1.3, k) * lit, 1.0); }` });
    const g = new THREE.CylinderGeometry(RCI * 0.97, RCI * 0.97, HC, 32, 1, true); g.translate(0, YC + HC / 2, 0); xrayG.add(new THREE.Mesh(g, coreMat)); }

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
    mesh(lathe([[0, -0.03], [0.086, -0.03], [0.1, -0.014], [0.1, 0.05]]), M.nozzle, g);                       // the sleeve
    mesh(lathe([[0.1, -0.004], [0.128, -0.004], [0.134, 0.006], [0.134, 0.05]]), M.thread, g);                 // the retaining ring
    const hole = mesh(new THREE.CircleGeometry(1, 32), M.dark, g, false); hole.rotation.x = Math.PI / 2; hole.position.y = -0.0315;
    const lip = mesh(new THREE.RingGeometry(1, 1.16, 32), M.thread, g, false); lip.rotation.x = Math.PI / 2; lip.position.y = -0.031; hole.userData.lip = lip;   // the worn bright edge of the bore
    nozzles[kind].push({ g, hole, r, y, a, len: y - yEnd - 0.032 });
  }

  // --- the rolling cutter bit: three legs, each carrying a cone on a journal that points down and in ---
  { mesh(lathe([[0, 0.98], [0.5, 1.03], [0.8, 1.22], [0.84, 1.48], [0.74, 1.6], [0.62, 1.66]]), M.body, tri); pinAndShank(tri, M.body, 2.0);
    const rowsOf = [[0.25, 0.42, 0.6, 0.775], [0.33, 0.51, 0.66, 0.775], [0.29, 0.47, 0.63, 0.775]], LW = 58 * Math.PI / 180;
    const tooth = new THREE.CylinderGeometry(0.02, 0.058, 0.1, 4, 1); tooth.rotateY(Math.PI / 4);
    const legPts = [[0.92, 1.55], [0.985, 1.42], [0.985, 0.44], [0.965, 0.36], [0.44, 0.93], [0.42, 1.3], [0.92, 1.55]];
    const tipPts = [[0.985, 0.5], [0.985, 0.24], [0.972, 0.17], [0.46, 0.9], [0.46, 1.0], [0.985, 0.5]], TW = 32 * Math.PI / 180, tipShape = new THREE.Shape(tipPts.map(V2));   // the shirttail narrows towards its tip
    const legShape = new THREE.Shape(legPts.map(V2));
    const upPts = [[0.9, 1.55], [0.985, 1.43], [0.985, 1.02], [0.94, 0.95], [0.5, 0.98], [0.42, 1.3], [0.9, 1.55]], UW = 106 * Math.PI / 180, upShape = new THREE.Shape(upPts.map(V2));
    tri.userData.cones = [];
    for (let k = 0; k < 3; k++) {
      const leg = new THREE.Group(); leg.rotation.y = -k * 2 * Math.PI / 3; tri.add(leg);
      mesh(lathe(legPts, true, 20, Math.PI / 2 - LW / 2, LW), M.body, leg);
      for (const sg of [-1, 1]) { const c = mesh(new THREE.ShapeGeometry(legShape), M.body, leg); c.rotation.y = sg * LW / 2; }
      mesh(lathe(tipPts, true, 12, Math.PI / 2 - TW / 2, TW), M.body, leg);
      mesh(lathe(upPts, true, 30, Math.PI / 2 - UW / 2, UW), M.body, leg);
      for (const sg of [-1, 1]) { const c = mesh(new THREE.ShapeGeometry(upShape), M.body, leg); c.rotation.y = sg * UW / 2; }
      // the grease reservoir cap on the outside of the leg, and the hard-faced edge of the shirttail
      { const cap = mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 32), M.thread, leg); cap.rotation.z = Math.PI / 2; cap.position.set(0.99, 1.2, 0);
        const snap = mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 32), M.dark, leg, false); snap.rotation.y = Math.PI / 2; snap.position.set(1.006, 1.2, 0);
        const hub = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 6), M.cone, leg); hub.rotation.z = Math.PI / 2; hub.position.set(0.995, 1.2, 0);
}
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
    nz.jet = new THREE.Mesh(jetGeo, jetMat()); nz.jet.renderOrder = 2; nz.jet.position.y = -0.032; nz.g.add(nz.jet);
    nz.splash = new THREE.Mesh(splashGeo, new THREE.MeshBasicMaterial({ color: 0x9c8562, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })); nz.splash.position.y = -nz.len - 0.032 + 0.014; nz.splash.renderOrder = 2; nz.g.add(nz.splash);
  });

  // ---------- cuttings: chips leave the bottom, pass the bit at the wall and climb the annulus ----------
  const NCH = 340, chipGeo = new THREE.IcosahedronGeometry(0.036, 0), chips = new THREE.InstancedMesh(chipGeo, new THREE.MeshStandardMaterial({ color: 0x2f2a25, roughness: 0.9, flatShading: true }), NCH); chips.castShadow = true; asm.add(chips);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const born = (c) => { c.st = 0; c.t = 0; c.r = rnd(0.2, 0.9); c.phi = rnd(0, 2 * Math.PI); c.hop = rnd(0.08, 0.2); c.y = 0; };
  const CH = []; for (let i = 0; i < NCH; i++) { const c = { lane: rnd(0, 1), rot: rnd(0, 6), sc: [rnd(0.6, 1.6), rnd(0.35, 0.8), rnd(0.6, 1.3)], slip: rnd(0.75, 1) }; born(c); if (i % 4) { c.st = 2; c.y = rnd(0.2, TOP); } CH.push(c); }
  const dummy = new THREE.Object3D();

  // the floor under a chip: the true hole bottom behind the cut, the level floor in front of it
  const bottomHere = (kind, c) => Math.sin(c.phi) > 0 ? 0 : bottomY(kind, Math.min(c.r, 1));

  // ---------- the bench the bit stands on when it is out of the hole ----------
  { const t = mesh(new THREE.CylinderGeometry(3.3, 3.4, 0.14, 72), M.table, studioG, false); t.position.y = -0.07; }

  // ---------- state the page drives ----------
  const vis = (v) => v > 0 ? 0.34 * Math.sqrt(v) : 0;      // picture speed (units/s) for a real speed in ft/s; compressed so jets and annulus can be seen together
  let flip = 0, shownBit = null, shownMode = null, depth = 0, making = 1;
  const RATE = 0.03;                                       // how fast the picture drills, scene units per second (about 0.13 in/s)
  function apply() {
    if (shownBit !== S.bit) { shownBit = S.bit; tri.visible = S.bit === 'tri'; pdc.visible = S.bit === 'pdc'; holeVar.tri.visible = S.bit === 'tri'; holeVar.pdc.visible = S.bit === 'pdc'; mudFace.geometry = holeVar[S.bit].userData.mudGeo; CH.forEach(c => { if (c.st < 2) born(c); }); }
    if (shownMode !== S.mode) { shownMode = S.mode; holeG.visible = S.mode === 'hole'; studioG.visible = S.mode === 'studio'; }
    cutG.visible = false; xrayG.visible = !!S.cut; wholeG.visible = !S.cut; wholeG.rotation.y = xrayG.rotation.y = spin.rotation.y;
  }
  stage.onUpdate((dt) => {
    apply();
    const want = S.mode === 'studio' && S.flip ? 1 : 0; flip = clamp(flip + Math.sign(want - flip) * dt / 2.2, 0, 1); const e = ease(flip);
    const turning = S.mode === 'hole' && S.turn !== false, w = turning ? 2 * Math.PI / (S.slow || 6) : 0;
    // penetration: while the bit turns and the mud clears the bottom, the hole deepens and everything goes down with it
    making = clamp(making + (S.q > 0 ? 1 : -1) * dt / 1.5, 0, 1);
    if (turning && !S.loop) { depth += RATE * making * dt; if (depth >= DMAX) { depth = DMAX; S.loop = true; } }
    const dd = S.mode === 'hole' ? depth : 0; S.depth = depth; asm.position.y = -depth; floorPlane.constant = -depth; stage.setLift(-dd);
    bit.rotation.x = Math.PI * e; bit.position.y = 2.52 * e - dd;
    spin.rotation.y -= w * dt; tri.userData.cones.forEach(c => { c.rotation.y += w / SA * dt; });
    const vj = vis(S.vn), va = vis(S.va), vp = vis(S.vp);
    mudMat.uniforms.uUp.value += va * dt * 0.8; mudMat.uniforms.uDown.value += vp * dt * 0.8;
    const showJets = S.mode === 'hole' && S.q > 0;
    nozzles[S.bit].forEach((nz, i) => {
      const rn = (S.noz[i] / 64) / (GEOM.bit / 2);                                   // nozzle radius in scene units, to scale
      nz.hole.scale.setScalar(rn); nz.hole.userData.lip.scale.setScalar(rn); nz.jet.visible = nz.splash.visible = showJets;
      nz.jet.scale.set(rn, nz.len, rn); nz.jet.material.uniforms.uPhase.value += vj * dt / Math.max(0.2, nz.len) * 0.6;
      nz.splash.scale.setScalar(rn * 4.2);
    });
    // chips
    const kind = S.bit;
    for (let i = 0; i < NCH; i++) {
      const c = CH[i]; let r = c.r;
      if (S.mode === 'hole') {
        if (c.st === 0) { c.t += dt; c.r += 0.12 * dt; c.y = bottomHere(kind, c) + 0.03 + c.hop * Math.sin(Math.PI * Math.min(1, c.t / 0.8)); if (c.t >= 0.8) c.st = 1; }           // broken off: it jumps clear of the floor
        else if (c.st === 1) { c.r += vj * 0.07 * dt * (0.5 + c.lane); c.phi += w * 0.5 * dt; c.y = bottomHere(kind, c) + 0.03; if (c.r >= 0.985) { c.r = 0.985; c.st = 2; } }     // swept across the floor by the jets
        else { c.y += va * c.slip * dt; if (c.y < 1.9) c.phi += w * 0.3 * dt; if (c.y > TOP - 0.2) born(c); }                                                                // carried up by the mud
        r = c.r;
      }
      if (c.st === 2) { const xa = 0.975 + 0.03 * c.lane, xb = RCO + 0.05 + c.lane * (RH - RCO - 0.1), f = clamp((c.y - 1.9) / 0.8, 0, 1); r = xa + (xb - xa) * f * f * (3 - 2 * f); }
      dummy.position.set(r * Math.cos(c.phi), c.y, r * Math.sin(c.phi)); dummy.rotation.set(c.rot, c.rot * 1.7 + c.y * 0.6, c.rot * 0.6); dummy.scale.set(c.sc[0], c.sc[1], c.sc[2]); dummy.updateMatrix(); chips.setMatrixAt(i, dummy.matrix);
    }
    chips.instanceMatrix.needsUpdate = true;
  });

  // ---------- where things are, for labels ----------
  const tmp = new THREE.Vector3(), best = new THREE.Vector3();
  // a point on the bit given by radius, height and azimuth; of its copies around the bit, the one nearest the camera
  const onBit = (r, y, az0, copies) => () => { let d = Infinity; for (let k = 0; k < copies; k++) { const a = (az0 + k * 360 / copies) * Math.PI / 180; tmp.set(r * Math.cos(a), y, r * Math.sin(a)); spin.localToWorld(tmp); const dd = tmp.distanceToSquared(stage.camera.position); if (dd < d) { d = dd; best.copy(tmp); } } return best.clone(); };
  const fixed = (x, y, z) => { const v = new THREE.Vector3(); return () => v.set(x, y - (S.mode === 'hole' ? depth : 0), z); };
  const cams = {
    hole: { az: 90, el: 11, dist: 17.5, tx: 0, ty: 3.2, tz: 0 },
    bottom: { az: 74, el: 16, dist: 8.6, tx: 0, ty: 1.0, tz: 0 },
    jets: { az: 84, el: 13, dist: 6.0, tx: 0, ty: 0.6, tz: 0 },
    studio: { az: 62, el: 14, dist: 10.5, tx: 0, ty: 1.2, tz: 0 },
    face: { az: 62, el: 40, dist: 11.5, tx: 0, ty: 1.45, tz: 0 }
  };
  const bitBox = (project) => {   // the part of the picture labels must stay off: the bit itself
    const pts = []; for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) for (const y of [0.1, 2.4]) { tmp.set(x, y - (S.mode === 'hole' ? depth : 0), z); const p = project(tmp); if (p) pts.push(p); }
    if (pts.length < 4) return []; const xs = pts.map(p => p.x), ys = pts.map(p => p.y); return [{ x0: Math.min(...xs) + 6, y0: Math.min(...ys) + 6, x1: Math.max(...xs) - 6, y1: Math.max(...ys) - 6 }];
  };
  return { stage, cams, bitBox, restart: () => { depth = 0; S.loop = false; }, RATE, onBit, fixed, bottomY, vis, get flip() { return flip; }, get pending() { return pending; }, RCO, RCI, RH, YC };
}
