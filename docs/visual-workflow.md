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
