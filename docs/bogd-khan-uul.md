# Bogd Khan Uul level

Bogd Khan Uul is a 6,400 × 4,000-unit authored battlefield inspired by the protected massif south of Ulaanbaatar. It is a camp-sized piece of the Tuul-side foothills rather than a summit ascent: a broad lower meadow meets the river in the north, while forested heights frame one raised southern shoulder.

## Layout and traversal

The camp sits on open lower ground at `(-2050, -500)`, away from both painting seams, with a 520-unit spawn-safe clearing. The Tuul follows the northern edge. One 240-unit woodland shoulder fills the south and is reached by broad west and east ramps. Connected tracks link the camp, Tuul landing, larch glade, Tuul bend, Tsetsee shoulder and Pine Hollow; no track ends anonymously in open ground.

The lower meadow and upper shoulder leave broad clear lanes for horde combat. Pine and golden-larch groves concentrate at the outer boundaries, beside the river and along the high shoulder. Dressing clearance keeps trees, scrub and rocks away from camp, tracks, ramp grades, water and solid landmark footprints.

## Hybrid rendering boundary

Four 1,600 × 1,000 opaque ground paintings cover the approved 6,400 × 4,000 play rectangle. They contain only meadow, woodland soil, roots, needles, gravel, dry Tuul banks and worn tracks. The shared 1,024² grayscale detail tile restores close brush grain. Runtime geometry still owns elevation, cliff faces, ramp grades, water, collision, vegetation, landmarks, actors and shadows.

Development builds can append `?bogdKhanUulPaintedGround=0` to inspect the tiled material fallback, or `?bogdKhanUulLevel=generated` to load the former generic region. Shipping builds always use the authored level and paintings.

The four paintings plus detail occupy 39,724,100 uncompressed GPU bytes (37.88 MiB) with complete mip chains. A repeatable capture view is available through `npm run visual:bogd`; it is a diagnosis capture, not a regression suite, and was not run during this change because browser suites require separate approval.

A paired 30-second, 350-enemy manual `profileCrowd` sample on SwiftShader measured 8.292 ms per World3D render for the authored level versus 11.526 ms for its retained pre-authored generated fallback, 28.1% faster and therefore inside the 10% frame budget. World3D draw time was 2.722 ms versus 2.677 ms (+1.7%). Both samples used full render scale, seed 1 and the same Chromium session.

## Terrain sites and follow-ups

The Tuul landing, bend, larch glade, Tsetsee shoulder and Pine Hollow are terrain/scenery sites only. Existing bundled boulders, pebbles and scree mark a few edges without inventing buildings or culturally specific monuments.

Possible later gameplay work, deliberately not implemented here:

- a river-bank defense or crossing objective;
- forage or shelter rewards in Pine Hollow and the larch glade;
- threats tied to the forest edge or Tuul floodplain;
- dedicated Bogd Khan Uul landmark art if a researched feature needs more than the existing scenery atlas.
