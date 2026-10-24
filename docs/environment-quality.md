# Environmental materials and ecology

The environment quality pass keeps Phaser simulation, Three.js terrain, existing
actors/buildings, and the 48° orthographic camera. Golden Pasture is the reference
scene: seed `living-steppe-scenes-v3:golden-pasture`, camera target (2600,2600), zoom 1.
Before/after captures live under `test-results/environment/`.

## Material inspection and changes

The previous shader sampled paintings but replaced their RGB with a nearly uniform
palette color plus a narrow brightness range. Most ground vertices also shared the
same grass/soil weights. This removed both the paintings' detail and geographic
variation. Cliff granite suffered from the same luminance reduction.

`terrainHabitat.ts` now supplies shared global masks for broad moisture, exposure,
medium patches, sheltered groves, river margins, cliff feet, cliff rims, and worn
camp/caravan ground. `sceneGeometry.ts` turns these masks into normalized material
coverage. It changes surface appearance without moving collision or terrain vertices.

`terrainShader.ts` blends actual painted RGB in world space. Grass, dry grass,
soil, gravel, exposed granite, snow, and ice use different texture scales and smooth
coverage. Healthy grass and dry turf retain their original brush detail; soil and
fine gravel sample the existing granite-desert painting at different scales.
Triplanar granite retains fractures on vertical faces. Rotated secondary samples
and independently scaled material patches break up repetition. Mipmaps and bounded
anisotropic filtering preserve stable detail on the angled ground. Regional palettes
apply restrained relative tint, preserving the source paintings' color variation.

| Existing painting        | Role                                |
| ------------------------ | ----------------------------------- |
| `tapestry-meadow-v3.png` | Healthy sage grass and sparse turf  |
| `steppe-ground.png`      | Dry golden grass                    |
| `eej-khairkhan.png`      | Earth, rocky soil, and fine gravel  |
| `tapestry-stone-v3.png`  | Exposed granite and cliff fractures |
| `khan-tengri.png`        | Snow and ice                        |

Material tests check finite normalized coverage across biomes/elevations/slopes,
coherent neighboring patches, wetter river margins, and unchanged terrain heights.
The existing terrain tests continue checking exact surface queries and chunk seams.
