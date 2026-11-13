# Altai Tavan Bogd level

Altai Tavan Bogd is an authored glacial-valley battlefield inspired by the five sister peaks,
Potanin glacier, broad Mongol Altai moraine valleys, and the elongated Khoton–Khurgan lake
landscape. It is a camp-sized fantasy compression rather than a summit ascent or literal map.
Run `npm run dev` or `npm run dev:web`, press **F8**, and choose **Altai Tavan Bogd**.

## Layout

`src/game/data/altaiTavanBogd.ts` is the source for centre-relative coordinates (+x east, +y
south). The playable rectangle is 6,400 × 4,000 world units, matching Orkhon Valley and Altan
Ovoo.

- The live camp sits on open lower-valley gravel at `(-1900, 900)`, away from both painted-ground
  seams, with a 520-unit spawn-safe clearing.
- One irregular northern moraine terrace forms the upper tier, 240 units above the valley.
- Broad west and east ramp cuts complete a loop across the moraine and back to the lower valley.
- One continuous five-peak panorama and glacier tongue forms a distant wall beyond the impassable northern play bound; no isolated peak cutout stands on the ground.
- An impassable calm turquoise glacial channel broadens into the long lake along the eastern edge.
- The main circuit joins camp, both ramps, the western moraine pass, Potanin overlook, lake shore
  and lower-valley junction. Lower branches join the boulder meadow and southern lake meadow.

Every worn track ends at a named terrain place or another route. The camp, central lower valley,
moraine centre and ramp approaches remain broad horde-combat spaces.

## Hybrid terrain and painted ground

The existing authored-level renderer owns elevation, cliff walls, graded ramps, water, collision,
navigation, props and shadows. Four 1,600 × 1,000 ground paintings project over the 3,200 × 2,000
NW, NE, SW and SE quadrants. One whole-level source painting is split into those quadrants so every
track and material crosses both seams without a restart. They contain horizontal ground only: silver-green gravel, muted sage,
tracks, angular scree, sharp snow patches, glacier silt and pale lake banks. Crisp, visible gouache
strokes keep gravel, grass and tracks legible at play scale. The raised moraine uses the same matte
manuscript language as the lower valley, shifted cooler and darker.

The 8,000-unit terrain canvas surrounds the 6,400 × 4,000 playable rectangle with 800-unit side
buffers and 2,000-unit north/south buffers, so the angled camera never exposes an unpainted world
edge. The painted quadrants still project only over the playable rectangle; the buffer uses the
matching tiled fallback.

The shared 1,024² grayscale detail layer restores close paper and brush grain in world space. A
separate 1,024² crisp scree-and-snow tile covers the terrain buffer beyond the painted rectangle,
replacing the old noisy grey fallback.
The four paintings occupy 34,131,696 bytes (32.55 MiB) with complete mip chains; including the
detail layer they occupy 39,724,100 bytes (37.88 MiB). The northern fallback adds 5,592,404 bytes
(5.33 MiB) with mips. The continuous ridge uses 5,933,904 bytes (5.66 MiB) without mips, for
51,250,408 bytes (48.88 MiB) across Altai's new ground and ridge textures.

Development-only `?altaiTavanBogdPaintedGround=0` keeps the authored geometry on its tiled
fallback. `?altaiTavanBogdLevel=generated` restores the former generated composition.
`npm run visual:altai` supplies fixed-camera screenshot views when a browser capture run is
explicitly approved.

## Real-landscape sources

The layout follows descriptions of five sister peaks, icy rivers, vast mountain valleys and the
Khoton, Khurgan and Dayan lakes in [UNESCO's Highlands of Mongol Altai
submission](https://whc.unesco.org/en/tentativelists/5955/). UNESCO's [Altai landscape
study](https://whc.unesco.org/uploads/news/documents/news-433-1.pdf) describes glaciated rocky
ridges, precipitous valleys, boulder-strewn high plains and narrow green meltwater ribbons across
the drier Mongolian side. The [Altai Tavan Bogd National Park
brochure](https://wwfasia.awsassets.panda.org/downloads/engp38_tavanbogd_map_brochure.pdf) describes
the major glaciers and connected glacial-origin Khoton and Khurgan lakes.

Khoton and Khurgan are elsewhere within the much larger park, not directly below Potanin glacier;
the level deliberately compresses their long-lake form into one regional composition. It adds no
ritual, archaeological, sacred-site, threat or reward interpretation.

## Existing-art mapping and follow-ups

The northern frame uses one dedicated transparent five-peak panorama instead of separate peak
cutouts. Existing Orkhon rocks, pebbles, scree and restrained shrubs provide sparse edge dressing.
No new gameplay system was added.

Possible follow-ups remain separate:

- glacier crevasse or cold-exposure hazards;
- lake crossing, boats, fishing, water gathering or lake rewards;
- wildlife behaviour for argali, ibex, snowcocks or golden eagles;
- a glacier-overlook objective, encounter, boon or resource node;
- additional long-lake-shore variants.

Camera, combat, class kits, saves, UI and migration rules are unchanged.
