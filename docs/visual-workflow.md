# Visual development workflow

Tools for checking how painted textures and atlases will sample in the renderer, and for
looking at the running game, before and after an art or rendering change. Everything here is
development-only: none of it ships in the game or runs in `npm run check`.

## Texture and atlas tools

Three scripts in `scripts/atlas/` use the `sharp` dev dependency. Their pure logic (image
helpers, measurements, pass/warn/fail checks) lives in `image.mjs`, `analysis.mjs` and
`checks.mjs`, which `scripts/cut-orkhon-terrain-kit.mjs` and `scripts/measure-art.mjs` share, and
which `tests/unit/atlasImage.test.ts` and `tests/unit/atlasChecks.test.ts` cover. `io.mjs` reads
and writes files.

```sh
npm run atlas:inspect -- public/art/orkhon-valley/ground/valley_calm.png
npm run atlas:inspect -- public/art/orkhon-valley/orkhon-terrain-kit.png \
  --frames public/art/orkhon-valley/orkhon-terrain-kit.json
npm run atlas:inspect -- art-source/orkhon-terrain-kit.png --grid 256
npm run atlas:validate -- public/art/orkhon-valley/water/bank_far.png --axes x
npm run atlas:orkhon
npm run atlas:assemble -- --out /tmp/atlas/props --padding 6 --extrude 2 --trim --bleed pieces/*.png
```

**Inspect** prints JSON: size, whether both sides are powers of two, alpha coverage (shares of
transparent, partial and opaque texels), colour statistics over painted texels (CIELAB L\* and
C\* percentiles, hue, median, edge feather; the same measure as `measure-art`). A tile also gets
its seam score and the mean L\* of each quarter. With `--frames <atlas.json>` (Phaser hash or
array JSON) or `--grid <cell pixels>` it reports each frame's painted bounds and the frame sides
they touch, sides cut straight through opaque paint, alpha coverage, L\* range and edge colour.

**Validate** checks a tile, or an atlas when `--frames` is given, and prints only warnings and
failures (`ATLAS_VERBOSE=1` prints every check, `--json` the full report). It exits 1 when any
check fails.

| Check                | Applies to | Measures                                                                                                                               |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `seam`               | Tile       | Colour step across the wrap / step between interior neighbours (1 is seamless; warn > 1.25, fail > 1.6). `--axes x` for bank bands.    |
| `mip-seams`          | Tile       | The same score down the mip chain to 16 texels (warn > 1.5): a seam can appear only on distant ground.                                 |
| `mip-power-of-two`   | Both       | The wrapping sides halve evenly down the mip chain.                                                                                    |
| `texel-density`      | Tile       | World units per texel against `docs/art-spec.md` (0.78; `--world-size` sets the units one repeat covers; fail beyond 5%).              |
| `repeat-contrast`    | Tile       | L\* spread between the tile's quarters (halves for bands; warn > 4): a lighter corner makes the repeat period visible.                 |
| `opaque`             | Tile       | Ground tiles hold no transparency.                                                                                                     |
| `frames-in-bounds`   | Atlas      | Every frame lies inside the image.                                                                                                     |
| `frames-touching`    | Atlas      | Frame pairs with no gap, or overlapping (fail).                                                                                        |
| `frame-padding`      | Atlas      | Smallest gap between frames and to the atlas edge (`--padding`, default 2).                                                            |
| `mip-bleed`          | Atlas      | Deepest mip level at which bilinear sampling inside each frame reads no neighbouring frame (warn below 2 unless `--no-mipmaps`).       |
| `cropped-edge`       | Atlas      | Frame sides where at least a quarter of the texels are opaque paint: a straight crop line.                                             |
| `white-fringe`       | Atlas      | Share of outline texels (painted, beside a transparent texel) that are near white: a halo from a white backing (warn > 2%, fail > 8%). |
| `transparent-colour` | Atlas      | Transparent texels beside paint that hold white or black: straight-alpha bilinear filtering blends that colour into the edge.          |

`npm run atlas:orkhon` validates every Orkhon Valley tile and atlas the renderer loads, with the
sampling each one gets: ground and water tiles wrap on both axes, bank bands only along the shore,
the terrain kit atlas is mipmapped, the pack sprite atlas is not.

**Assemble** packs PNG pieces into one atlas (default 1024 wide, power-of-two height) and writes
`<out>.png` and `<out>.json` (a Phaser hash; frames are named after the files and cover the pieces
without their extrusion). `--padding` empty texels separate pieces; `--extrude` repeats each
piece's edge texels into that padding so sampling at a frame edge reads its own colour.
`--trim` crops transparent margins and `--bleed` fills transparent texels with nearby paint. Pass
an output directory outside `public/art/` while experimenting.

## Looking at the game through Playwright MCP

The project's `.mcp.json` registers a `playwright` MCP server for Claude Code and any other MCP
client that reads a project file. It runs `@playwright/mcp` at the pinned version `0.0.83`
(through `npx`, so the first start downloads it) with this machine's Chromium at
`/usr/bin/chromium` (Google Chrome is not installed), headless, at a 1280×800 viewport, with a
fresh in-memory profile (`--isolated`, so parallel worktrees do not share one). Screenshots,
page snapshots and console logs land in the gitignored `.playwright-mcp/` folder. On another
machine, change `--executable-path` locally rather than committing it. Headless Chromium uses
the GPU here, so WebGL renders as in the desktop game.

An agent session:

1. Start the browser build on a port no other worktree uses and leave it running:
   `npm run dev:web -- --port 5191 --strictPort`.
2. `browser_navigate` to `http://127.0.0.1:5191/`.
3. Wait for the development hooks with `browser_evaluate`:
   `async () => { while (!window.__gloam?.hooks) await new Promise((r) => setTimeout(r, 100)); }`.
4. Load a fixed scene with the [game-control hooks](developer-mode.md#game-control-hooks), then
   wait for it to settle:

   ```js
   async () => {
     const h = window.__gloam.hooks;
     await h.loadScenario({ place: 'orkhon-valley', seed: 1 });
     h.setCamera({ x: 2850, y: 1325, zoom: 1 });
     await h.captureScene({ timeout: 60000 });
     return h.getState().camera;
   };
   ```

5. `browser_take_screenshot` (type `png`). The image comes back to the agent to inspect and is
   saved under `.playwright-mcp/`; `browser_console_messages` shows renderer warnings.
6. `browser_close` when done, and stop the dev server.

`loadScenario` freezes the scene and `freezeVisuals` pins the 3D render scale at 100%, so the
same calls give the same picture. To hide the HUD and menus before a terrain screenshot, hide
everything over the game canvas:
`() => document.head.insertAdjacentHTML('beforeend', '<style>#arena-wrap > :not(#game-canvas) { visibility: hidden !important }</style>')`.

Verified on 2026-11-11 with a minimal stdio MCP client that started the server exactly as
`.mcp.json` describes, listed its tools, ran steps 2–6 against `npm run dev:web` and received a
1280×800 PNG of Orkhon Valley; the console log showed the NVIDIA GL driver (hardware WebGL).

## Repeatable Orkhon Valley captures

`npm run visual:orkhon` draws seven fixed Orkhon Valley terrain views at 1280×800 and saves them
as PNGs in the gitignored `test-results/visual/orkhon/` (or `VISUAL_OUTPUT_DIR`). It is a capture,
not a regression test: nothing is compared, and it is excluded from `npm run test:e2e` and
`npm run test:reference`. Like the reference scenes it takes the shared browser lock, starts its
own dev server (`E2E_PORT` moves the port) and uses the local GPU policy in
`playwright.graphics.ts`.

Each view (`tests/visual/orkhon-capture.spec.ts`, config `playwright.visual.config.ts`) loads the
seeded Orkhon checkpoint with `loadScenario`, sets the 3D resolution to 100% (the Settings
option) and, for the grazing view, the camera elevation (the console's `camera-angle`), then
`freezeVisuals`, `setCamera` and `captureScene`, and hides the HUD.

| File                       | View                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `01-valley-ground.png`     | Open valley floor south-west of camp: tiles, regions and trails  |
| `02-plateau-edge-ramp.png` | The falls-plateau ramp nearest camp with its cliffs and rim      |
| `03-ramp-closeup.png`      | The same ramp at the closest zoom (1.6)                          |
| `04-river-bank-bridge.png` | The bridge, river tiles and bank bands                           |
| `05-falls.png`             | The falls, plunge pool and the head of the river                 |
| `06-overview-zoom60.png`   | The widest zoom the game allows (0.6) around camp                |
| `07-grazing-angle.png`     | Camera elevation 35° (the debug minimum) across the valley floor |

Compare captures from before and after a change on the same machine: they depend on the GPU and
browser that drew them.

For the reversible painted-ground prototype, an ordinary capture keeps the current ground. Set
`ORKHON_PAINTED_GROUND=1` to pass the development-only `?orkhonPaintedGround=1` URL flag:

```sh
VISUAL_OUTPUT_DIR=/tmp/orkhon-current npm run visual:orkhon
ORKHON_PAINTED_GROUND=1 VISUAL_OUTPUT_DIR=/tmp/orkhon-painted npm run visual:orkhon
```
