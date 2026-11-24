# Drilling bits and bit hydraulics

One interactive 3D page for the rotary drilling bits chapter of Bourgoyne, Millheim, Chenevert and Young,
*Applied Drilling Engineering* (Ch. 5, with §4.7 Flow through jet bits, §4.13 Jet bit nozzle size selection and Eq. 1.16).

Open `index.html` through a web server (for example `python -m http.server`), or use the published page.

## What is on the page

1. **On bottom** — a block of rock cut through the hole, the collar cut open, the bit turning, mud going down the bore,
   out of the nozzles and up the annulus with the cuttings. Three speeds computed from the pump rate.
2. **Two kinds of bit** — a three-cone rolling cutter bit and a PDC bit, taken out of the hole and turned over, parts named.
3. **The jets** — nozzle area, nozzle velocity, pressure drop, hydraulic power and impact force (Eqs. 4.33, 4.34, 4.35, 4.37),
   one variable changed alone on a chart, and four targets.
4. **Choosing nozzles** — Example 4.31: parasitic loss from two pump readings, the best rate for impact force or hydraulic power,
   and the nozzle sizes that use the pressure left.
5. **Cost per foot** — Eq. 1.16 with the three bits of Example 1.5.

## Files

- `physics.js` — the equations, in field units. `node check.mjs` checks them against the book's worked examples
  (4.12 to 4.15, 4.31, 1.5) and shows that every target on the page can be reached with the controls.
- `scene.js` — the 3D picture (three.js). One scene unit is 4.25 in; the bit is 8½ in, the collar 6½ in by 2 13/16 in.
  Nozzles and jets are drawn to that scale. Animation speeds are compressed (square root of the real speed) and slowed; the page says so.
- `app.js`, `index.html` — the five steps, controls, charts and labels. `kit.js` — stage, camera and label placement.
- `tex/` — rock textures from Poly Haven (CC0).

## What is not modelled

How fast the hole bottom is cleaned, tooth and bearing wear, and penetration rate are not computed. The cuttings in the picture
move with the mud and stop when the pump stops; their number is not a prediction.
