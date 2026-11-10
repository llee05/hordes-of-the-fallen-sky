# Orkhon Valley Terrain Kit — Art Order

This art order specifies a complete modular terrain and elevation kit for **Orkhon Valley (Ulaan Tsutgalan)**,
rebuilding the environment in the **antique hand-painted manuscript style** (2D/2.5D) established in
[the art specification](../art-spec.md#manuscript-style).

The kit provides every piece required to assemble the two-level Orkhon battlefield: calm parchment ground
tiles in distinct valley and plateau tones, modular basalt cliff walls with inner/outer corners and ramp ends,
riverbank channels and a calligraphic waterfall.

The captain generates this sheet in **GPT Image** (DALL-E 3) as a single production sheet for unified lighting,
line weight, and mineral pigment saturation. A subsequent task will cut the sheet using Sharp, verify tileable
edges, and assemble the level geometry.

---

## 1. Paste-Ready GPT Image Prompt

Copy and paste the plain text block below directly into GPT Image. Attach `reference/orkhon_level_layout.png`
(and optionally the grey shape guide described in Section 6) to lock the perspective and layout.

```text
Use case: stylized-concept.
Asset type: ONE production modular terrain sprite sheet for an antique hand-painted 2.5D Mongolian fantasy game, The Living Steppe Tapestry.
Input image role: reference/orkhon_level_layout.png is the MASTER STYLE AND COMPOSITION REFERENCE for antique chronicle linework, muted mineral pigments, aged parchment paper, and basalt cliff structure. Do not copy modern video-game art.

CANVAS AND GRID SPECIFICATION:
Canvas size: 1536 pixels wide by 1024 pixels high.
EXACT GRID: exactly SIX equal columns and FOUR equal rows (24 equal cells, each cell exactly 256x256 pixels).
Every subject is strictly centered within its 256x256 cell with clean separation. No subject may touch or cross cell boundaries.
Row 1 (ground tiles) and Row 3 (river tiles) are edge-to-edge square textures on warm antique parchment paper.
Row 2 (cliff pieces) and Row 4 (waterfall/rock cutouts) are isolated cutouts on pure solid white (or genuinely transparent) background, with generous empty space around each silhouette.

ART STYLE AND MEDIUM:
Antique 13th-14th century Central Asian and Persian-Mongolian manuscript illumination (Jami al-Tawarikh chronicle miniatures), combined with the readable miniature scale of Thronefall and The Banner Saga.
Matte gouache washes with visible organic pigment texture over unpainted warm parchment paper (#e5cca8 / #dfc79b).
Fine hand-drawn dark carbon-umber ink outlines (#2b221a, 1 to 2 pixels wide), with natural calligraphic weight variation.
NO digital pure black (#000000). NO airbrush blur, NO soft gradients, NO photographic textures, NO 3D computer rendering, NO plastic specular shine.
Shading, depth, cliff relief, and rock fissures MUST use hand-drawn parallel and cross-hatched ink lines (fine pen strokes spaced 2-4 pixels apart), mimicking medieval woodcut and engraving.

CAMERA AND PERSPECTIVE:
Orthographic high three-quarter view looking down at exactly 48 degrees elevation above horizontal (WORLD_3D angle).
Camera azimuth: turned 30 degrees from north, viewing the terrain from the south-west looking toward the north-east.
Top horizontal faces (ground, plateau tops) are foreshortened by sin(48°) ≈ 0.74 in depth.
Vertical cliff faces are foreshortened by cos(48°) ≈ 0.67 on screen.
Parallel lines stay parallel (no vanishing point perspective).
Lighting: warm morning sunlight (#fff0db) from upper left; cool olive-umber shadow hatching on the right.

PALETTE CONTRACT:
- Ground base: aged vellum / warm raw linen (#e5cca8).
- Valley grassland: calm, desaturated sage-gold wash (#9c9261) and sun-faded straw (#b59d68). Low chroma (C* <= 30), absolutely NO saturated mustard, electric yellow, or bright green.
- Plateau-top grassland: cooler, visibly darker alpine sage-moss (#737a54 / #656c49). Must be instantly distinguishable from valley floor at a glance (L* 10-14 points darker).
- Dirt paths: pale raw umber worn earth (#a6835c).
- Basalt rock: weathered dark basalt stone (#5e5245) with deep umber crevices (#433930).
- River water: muted verdigris turquoise-slate (#4e6f77) with deep channel slate (#395c67) and calligraphic ripple lines.
- Foam / rapids: bone-white mineral chalk wash (#d8e2df), NOT blinding digital white.
- Ink contours: warm dark carbon umber (#2b221a).

ROW-BY-ROW CELL CONTENTS (6 columns x 4 rows):

ROW 1 — GROUND TEXTURE TILES (all tiles 256x256 square, edge-to-edge tileable on parchment ground):
- Col 1 (1,1): Valley Grass Base — calm sage-gold mineral wash over warm parchment, fine subtle grass tuft strokes, quiet and low-contrast negative space.
- Col 2 (1,2): Valley Grass Warm Variant — sun-cured dry straw and pale ochre wash, gentle natural brush variation, tileable.
- Col 3 (1,3): Valley Grass Muted Variant — quiet pale olive-sage wash, minimal contrast, tileable.
- Col 4 (1,4): Plateau-Top Grass — cooler, distinctly darker alpine sage-moss wash with small delicate upland tufts, visibly deeper tone than valley grass.
- Col 5 (1,5): Dirt Trail — packed pale raw umber earth path with fine pebbled texture running vertically through calm grass, tileable top-to-bottom.
- Col 6 (1,6): Scree & River Gravel — weathered slate-silt ground scattered with small rounded river pebbles and broken shale fragments.

ROW 2 — CLIFF ELEVATION KIT (all pieces isolated cutouts on solid white/transparent backing, vertical height ~160px within 256px cell, seen from south-west at 48° camera):
- Col 1 (2,1): Cliff Straight Run — straight front-facing vertical basalt cliff wall, vertical columnar joint hatching, weathered brown-grey stone facets, with a thin painted grass lip along the top edge. Tiled horizontally.
- Col 2 (2,2): Cliff Outer Corner (90° convex) — projecting cliff corner with south-facing front face and foreshortened east-facing side face meeting at a crisp vertical ink ridge, grass lip on top plateau surface.
- Col 3 (2,3): Cliff Inner Corner (90° concave) — re-entrant cliff corner showing two meeting recessed basalt walls with ink hatching in the angle, grass lip above.
- Col 4 (2,4): Cliff Ramp Left Flank — tapered basalt cliff wall sloping down from plateau height (left) to valley floor (right) at a walkable 18° slope, hatched stone face, grass lip following slope.
- Col 5 (2,5): Cliff Ramp Right Flank — tapered basalt cliff wall sloping down from plateau height (right) to valley floor (left) at a walkable 18° slope, hatched stone face, grass lip following slope.
- Col 6 (2,6): Ramp Walkable Surface — inclined dirt and stone ramp tread connecting low valley floor to high plateau, foreshortened at 48°, flanked by low gravel borders.

ROW 3 — RIVER AND WATERWAY KIT (256x256 square, edge-to-edge tileable waterways):
- Col 1 (3,1): River Open Channel — calm mineral turquoise-slate water flow, flowing horizontal calligraphic current linework, tileable horizontally.
- Col 2 (3,2): River South Bank — horizontal riverbank with calm sage-gold grass along upper half, eroded clay-pebble lip with fine ink contour, muted turquoise water in lower half.
- Col 3 (3,3): River North Bank — horizontal riverbank with muted turquoise water in upper half, eroded clay-pebble bank with grass edge along lower half.
- Col 4 (3,4): River 90° Bend — curving waterway turning smoothly from north to east, framed by eroded grassy banks on inner and outer curves.
- Col 5 (3,5): Bridge Abutments — paired timber and rough-hewn basalt stone landing piers on opposing riverbanks, ready to support a wooden plank bridge deck.
- Col 6 (3,6): River Rapids / Rocky Ford — shallow river channel broken by dark rounded basalt boulders, calligraphic swirling line foam, and chalk-wash eddies.

ROW 4 — WATERFALL AND ROCK DETAILS (isolated cutouts on solid white/transparent backing):
- Col 1 (4,1): Waterfall Top Lip — plateau edge where river plunges over a dark basalt ledge, crested with calligraphic bone-white line foam.
- Col 2 (4,2): Waterfall Plunging Curtain — vertical sheer falling water column, fine vertical pen line streams, semi-transparent mineral chalk wash framing dark rock beneath.
- Col 3 (4,3): Waterfall Plunge Pool — churning circular base pool with concentric calligraphic ripples, mist spray, and bone-white chalk foam rings on turquoise water.
- Col 4 (4,4): Isolated Basalt Pillar — freestanding columnar rock tower with vertical ink hatching, flat grassy top, knee-high scree at base.
- Col 5 (4,5): Cliff-Foot Boulder Scree — natural elongated cluster of angular basalt boulders and broken rocks for placing along cliff bases.
- Col 6 (4,6): Sacred River Stone / Islet — small gravel-and-boulder river islet with a weathered standing stone draped with fine turquoise cloth ribbons.

STRICT CONSTRAINTS:
NO saturated mustard yellow, NO bright green turf, NO photographic grass scans, NO 3D rendered plastic surfaces, NO glossy reflections, NO soft airbrush glows, NO vignette, NO borders or picture frames, NO text, NO labels, NO numbers, NO watermark.
Each cell MUST be self-contained and fully separated from adjacent cells.
```

---

## 2. Sheet Layout Grid

The sheet is structured as a **6-column by 4-row grid** on a **1536 × 1024 pixel canvas**, yielding **24 uniform cells of 256 × 256 pixels**.

```
+---------------------------------------------------------------------------------------------------+
|                                 1536 x 1024 Canvas (256 x 256 Cells)                              |
+-------------------+-------------------+-------------------+-------------------+-------------------+-------------------+
| (1,1)             | (1,2)             | (1,3)             | (1,4)             | (1,5)             | (1,6)             |
| Valley Grass Base | Valley Grass Warm | Valley Grass Mute | Plateau Grass     | Dirt Trail        | Scree & Gravel    |
| [Tile, Opaque]    | [Tile, Opaque]    | [Tile, Opaque]    | [Tile, Opaque]    | [Tile, Opaque]    | [Tile, Opaque]    |
+-------------------+-------------------+-------------------+-------------------+-------------------+-------------------+
| (2,1)             | (2,2)             | (2,3)             | (2,4)             | (2,5)             | (2,6)             |
| Cliff Straight    | Cliff Outer Corner| Cliff Inner Corner| Cliff Ramp Left   | Cliff Ramp Right  | Ramp Surface      |
| [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  |
+-------------------+-------------------+-------------------+-------------------+-------------------+-------------------+
| (3,1)             | (3,2)             | (3,3)             | (3,4)             | (3,5)             | (3,6)             |
| River Channel     | River South Bank  | River North Bank  | River Bend 90°    | Bridge Abutments  | Rapids / Ford     |
| [Tile, Opaque]    | [Tile, Opaque]    | [Tile, Opaque]    | [Tile, Opaque]    | [Cutout, Transp]  | [Tile, Opaque]    |
+-------------------+-------------------+-------------------+-------------------+-------------------+-------------------+
| (4,1)             | (4,2)             | (4,3)             | (4,4)             | (4,5)             | (4,6)             |
| Waterfall Lip     | Waterfall Curtain | Waterfall Pool    | Basalt Pillar     | Cliff Talus Rocks | River Islet Stone |
| [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  | [Cutout, Transp]  |
+-------------------+-------------------+-------------------+-------------------+-------------------+-------------------+
```

### Cell Coordinates Table

|  Col  |  Row  | Pixel Bounding Box `(x, y, w, h)` | Piece Name               | Asset Type        | Background          |
| :---: | :---: | :-------------------------------- | :----------------------- | :---------------- | :------------------ |
| **1** | **1** | `(0, 0, 256, 256)`                | `ground_valley_calm`     | Seamless Tile     | Opaque parchment    |
| **2** | **1** | `(256, 0, 256, 256)`              | `ground_valley_straw`    | Seamless Tile     | Opaque parchment    |
| **3** | **1** | `(512, 0, 256, 256)`              | `ground_valley_olive`    | Seamless Tile     | Opaque parchment    |
| **4** | **1** | `(768, 0, 256, 256)`              | `ground_plateau_moss`    | Seamless Tile     | Opaque parchment    |
| **5** | **1** | `(1024, 0, 256, 256)`             | `ground_dirt_trail`      | Seamless Tile (V) | Opaque parchment    |
| **6** | **1** | `(1280, 0, 256, 256)`             | `ground_scree_gravel`    | Seamless Tile     | Opaque parchment    |
| **1** | **2** | `(0, 256, 256, 256)`              | `cliff_straight_run`     | Modular Sprite    | Transparent / White |
| **2** | **2** | `(256, 256, 256, 256)`            | `cliff_corner_outer`     | Modular Sprite    | Transparent / White |
| **3** | **2** | `(512, 256, 256, 256)`            | `cliff_corner_inner`     | Modular Sprite    | Transparent / White |
| **4** | **2** | `(768, 256, 256, 256)`            | `cliff_ramp_left`        | Modular Sprite    | Transparent / White |
| **5** | **2** | `(1024, 256, 256, 256)`           | `cliff_ramp_right`       | Modular Sprite    | Transparent / White |
| **6** | **2** | `(1280, 256, 256, 256)`           | `cliff_ramp_surface`     | Incline Sprite    | Transparent / White |
| **1** | **3** | `(0, 512, 256, 256)`              | `river_channel_flow`     | Seamless Tile (H) | Opaque water        |
| **2** | **3** | `(256, 512, 256, 256)`            | `river_bank_south`       | Bank Tile (H)     | Opaque ground/water |
| **3** | **3** | `(512, 512, 256, 256)`            | `river_bank_north`       | Bank Tile (H)     | Opaque ground/water |
| **4** | **3** | `(768, 512, 256, 256)`            | `river_bend_90`          | Corner Tile       | Opaque ground/water |
| **5** | **3** | `(1024, 512, 256, 256)`           | `river_bridge_piers`     | Modular Sprite    | Transparent / White |
| **6** | **3** | `(1280, 512, 256, 256)`           | `river_rapids_ford`      | Seamless Tile     | Opaque water/rock   |
| **1** | **4** | `(0, 768, 256, 256)`              | `waterfall_top_lip`      | Lip Sprite        | Transparent / White |
| **2** | **4** | `(256, 768, 256, 256)`            | `waterfall_curtain`      | Cascade Sprite    | Transparent / White |
| **3** | **4** | `(512, 768, 256, 256)`            | `waterfall_foam_pool`    | Basin Sprite      | Transparent / White |
| **4** | **4** | `(768, 768, 256, 256)`            | `landmark_basalt_pillar` | Prop Sprite       | Transparent / White |
| **5** | **4** | `(1024, 768, 256, 256)`           | `prop_cliff_scree`       | Prop Sprite       | Transparent / White |
| **6** | **4** | `(1280, 768, 256, 256)`           | `prop_river_islet`       | Prop Sprite       | Transparent / White |

---

## 3. Piece List, World Sizes, and Texel Density

The game engine samples terrain tiles at **1.56 world units per texel** (a 128 × 128 px tile covers 200 × 200 world units, per `ART_SPEC.orkhon.tileWorldSize`).
On this master sheet, each 256 × 256 cell provides a **2× master resolution** (0.78 world units per pixel), which the downstream cutter downsamples by 50% with Lanczos3 filtering to produce clean, artifact-free 128 × 128 px game tiles.

### 3.1 Ground Tiles (Row 1)

| Piece                 | World Size | Master Cell Size | Game Asset Size | Description & Tiling Role                                                                   |
| :-------------------- | :--------- | :--------------- | :-------------- | :------------------------------------------------------------------------------------------ |
| `ground_valley_calm`  | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Base valley grassland. Faded sage-gold wash (`#9c9261`). Seamless 4-way repeat.             |
| `ground_valley_straw` | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Sun-cured grass variant (`#b59d68`). Regionally blended to break repetition.                |
| `ground_valley_olive` | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Subdued olive variant (`#85865c`). Used for depression and shaded lowland.                  |
| `ground_plateau_moss` | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Upland alpine steppe (`#737a54`). Cooler, darker (L\* 49) for instant elevation legibility. |
| `ground_dirt_trail`   | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Worn earthen path (`#a6835c`). Tiles vertically along caravan routes.                       |
| `ground_scree_gravel` | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Broken shale gravel (`#8c8273`). Dressed at cliff bases and shoreline transitions.          |

### 3.2 Cliff & Ramp Kit (Row 2)

Orkhon plateaus rise **240 world units** above the valley floor (`ART_SPEC.orkhon.plateauRise`). Foreshortened on screen at the 48° camera angle (`cos 48° ≈ 0.669`), this 240-unit wall appears **~161 screen pixels tall**. In the 256 × 256 master cell, a 160 px wall leaves ~48 px of grass lip on top and ~48 px of bottom ground margin.

| Piece                | World Size (W × H) | Master Pixel Size | Game Asset Size | Description & Assembly Role                                                                    |
| :------------------- | :----------------- | :---------------- | :-------------- | :--------------------------------------------------------------------------------------------- |
| `cliff_straight_run` | 200 × 240 units    | 256 × 160 px      | 128 × 160 px    | Straight basalt cliff wall with vertical joint hatching and top grass lip. Tiles horizontally. |
| `cliff_corner_outer` | 200 × 240 units    | 256 × 160 px      | 128 × 160 px    | 90° convex corner facing south-west. South face 60% width, east face 40% width.                |
| `cliff_corner_inner` | 200 × 240 units    | 256 × 160 px      | 128 × 160 px    | 90° concave internal corner for alcoves, bays and gorge narrows.                               |
| `cliff_ramp_left`    | 200 × 240 units    | 256 × 160 px      | 128 × 160 px    | Flanking basalt wall tapering down left-to-right from 240 units to 0 units at 18° slope.       |
| `cliff_ramp_right`   | 200 × 240 units    | 256 × 160 px      | 128 × 160 px    | Flanking basalt wall tapering down right-to-left from 240 units to 0 units at 18° slope.       |
| `cliff_ramp_surface` | 200 × 240 units    | 256 × 200 px      | 128 × 160 px    | Walkable inclined path of worn earth and embedded gravel climbing the grade.                   |

### 3.3 River Kit (Row 3)

| Piece                | World Size | Master Cell Size | Game Asset Size | Description & Assembly Role                                                             |
| :------------------- | :--------- | :--------------- | :-------------- | :-------------------------------------------------------------------------------------- |
| `river_channel_flow` | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Open water surface (`#4e6f77` / `#395c67`). Tiles horizontally bank-to-bank.            |
| `river_bank_south`   | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Grass bank on upper half, water on lower half. Tiles horizontally along south shore.    |
| `river_bank_north`   | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Water on upper half, grass bank on lower half. Tiles horizontally along north shore.    |
| `river_bend_90`      | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Curving river channel routing the gorge around the eastern plateau shelf.               |
| `river_bridge_piers` | 200 × 120  | 256 × 160 px     | 128 × 80 px     | Dressed stone and timber abutments anchored on opposite banks for the bridge deck.      |
| `river_rapids_ford`  | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Shallow turbulent water with embedded river rocks and swirling calligraphic foam lines. |

### 3.4 Waterfall & Elevation Props (Row 4)

| Piece                    | World Size | Master Cell Size | Game Asset Size | Description & Assembly Role                                                       |
| :----------------------- | :--------- | :--------------- | :-------------- | :-------------------------------------------------------------------------------- |
| `waterfall_top_lip`      | 200 × 100  | 256 × 128 px     | 128 × 64 px     | Plateau brink where the gorge river plunges over basalt lip with foam crest.      |
| `waterfall_curtain`      | 200 × 240  | 256 × 160 px     | 128 × 160 px    | Sheer vertical falling cascade, calligraphic stream lines over shaded dark rock.  |
| `waterfall_foam_pool`    | 200 × 200  | 256 × 256 px     | 128 × 128 px    | Circular plunge basin with expanding wave rings and mineral chalk foam.           |
| `landmark_basalt_pillar` | 90 × 210   | 120 × 240 px     | 60 × 120 px     | Freestanding basalt column (`cliff_isolated` replacement) with vertical hatching. |
| `prop_cliff_scree`       | 160 × 70   | 200 × 90 px      | 100 × 45 px     | Rubble cluster of weathered boulders and gravel for cliff-foot dressing.          |
| `prop_river_islet`       | 120 × 90   | 160 × 120 px     | 80 × 60 px      | Small river islet with sacred ribboned cairn stone for gorge navigation landmark. |

---

## 4. Camera and Perspective Contract

Verify every asset against the game projection engine (`src/game/world3d/worldProjection.ts`):

- **Elevation angle:** Exactly **48° above horizontal** (`WORLD_3D.angle`).
- **Azimuth / Yaw:** Exactly **30° turned from north** (`WORLD_3D.yaw`). The camera looks down from the south-west toward the north-east.
- **Orthographic projection:** No perspective convergence or vanishing point; parallel lines in the world remain parallel on screen.
- **Top faces (ground plane):** Foreshortened vertically by $\sin(48^\circ) \approx 0.743$. A 200-unit square ground tile spans 200 units horizontally and 149 units in screen height.
- **Vertical faces (cliffs):** Foreshortened vertically by $\cos(48^\circ) \approx 0.669$. The 240-unit plateau cliff wall measures $240 \times 0.669 \approx 160.6$ pixels on screen.
- **Facing direction:** Cliff faces are viewed from the **south-west**. The front face of `cliff_straight_run` faces south/south-west directly toward the camera. `cliff_corner_outer` displays the meeting of the south-facing front facet and the receding east-facing flank.

---

## 5. Style and Material Rules (Cross-Reference)

Every element on the sheet must adhere strictly to [docs/art-spec.md](../art-spec.md#manuscript-style):

1. **Ink line weight:** 1.0–2.0 px at source texel density. Fine, unbroken, calligraphic contours using warm carbon-umber ink (**`#2b221a`**).
2. **Hatching:** Form shading and rock strata must use fine parallel or cross-hatched pen lines (2–4 px spacing), not soft airbrush or CG shadow maps.
3. **Parchment ground:** All ground surfaces must reveal the warm, unpainted manuscript parchment texture (**`#e5cca8`**) through translucent mineral washes.
4. **Muted mineral palette:**
   - Valley floor: `#9c9261` (calm sage-ochre), `#b59d68` (warm straw), `#85865c` (subdued olive).
   - Plateau tops: `#737a54` (alpine sage-moss), `#656c49` (upland olive).
   - Basalt rock: `#5e5245` (weathered face), `#433930` (crevice).
   - Water: `#4e6f77` (verdigris wash), `#395c67` (channel slate), `#d8e2df` (chalk foam).
5. **Elevation contrast:** Plateau tops must be visibly darker and greener (L\* ~46–52) than the warm, pale valley floor (L\* ~58–64), providing a 10–14 point luminance drop for immediate tactical readability.
6. **What to avoid:**
   - Saturated mustard / neon yellow turf (C\* must stay ≤ 30).
   - Photorealistic grass, 3D CG specular plastic sheen, or smooth phong shading.
   - Soft Gaussian blur or airbrush feathering that produces grey muddy edges.
   - Pasted opaque white rectangular blocks for waterfalls.

---

## 6. Image Attachments & Grey Shape Guide Description

### 6.1 Images to Attach to GPT Image

1. **Master Concept Reference:** `/home/amicablepigeon/Projects/firstmate/data/bh-65-orkhon-level-v2/pack/orkhon_valley_texture_pack_v2/reference/orkhon_level_layout.png`
   - _Why:_ This hand-painted manuscript map exhibits the exact desired chronicle line art, warm parchment paper, muted mineral washes, and basalt gorge structures.
2. **Approved Style & Linework Reference:** `public/art/steppe-props.png` or `public/art/creator-figures.png`
   - _Why:_ Demonstrates approved ink outline weight, ivory felt rendering, and mineral pigment saturation.

### 6.2 Grey Shape Guide Specification

Attaching a **grey silhouette shape guide** is strongly recommended for GPT Image to lock the exact 48° foreshortening angles, cliff heights, and corner alignments across the sheet.

**What the guide should show (description for creation):**

- A **1536 × 1024 px** image with the same 6-column by 4-row grid marked with faint 1px lines.
- Each cell contains a flat mid-grey silhouette (**`#808080`**) over pure white (**`#ffffff`**) defining the exact projection geometry:
  - **Row 1 (Cells 1,1 to 1,6):** Full 256 × 256 px solid grey squares indicating edge-to-edge tileable textures.
  - **Row 2, Col 1 (`cliff_straight_run`):** A grey rectangle 256 px wide by 160 px tall anchored at bottom, with a horizontal 24 px top band indicating the plateau rim.
  - **Row 2, Col 2 (`cliff_corner_outer`):** A projecting 90° corner with the south facet occupying 154 px of width and the receding east facet occupying 102 px of width, meeting at a vertical center-left ridge.
  - **Row 2, Col 3 (`cliff_corner_inner`):** An internal 90° corner recess showing two converging rock planes.
  - **Row 2, Col 4 & 5 (`cliff_ramp_left/right`):** A right-angled trapezoid tapering from 160 px height down to 0 px height across the 256 px cell width (an 18° slope).
  - **Row 2, Col 6 (`cliff_ramp_surface`):** An inclined path rectangle 200 px wide running from bottom to top.
  - **Row 3, Col 2 & 3 (`river_banks`):** A horizontal split at Y = 128 px, with a jagged 12 px lip delineating the bank from water.
  - **Row 4, Col 1–3 (`waterfall`):** Top lip 64 px tall; cascade curtain 160 px tall by 140 px wide; plunge pool an ellipse 200 px wide by 148 px tall.

---

## 7. Captain's Review Checklist

Before handing the generated sheet back to the worker, verify these six quality gates:

- [ ] **1. Authentic Manuscript Medium:** Does the art look like hand-painted gouache and carbon ink on aged vellum? Reject if it looks like modern 3D CG, vector clip-art, or photographic textures.
- [ ] **2. Calm Parchment Ground:** Is the ground a muted sage-gold over parchment (C\* ≤ 30)? Reject if it resembles electric mustard, saturated yellow-green, or neon turf.
- [ ] **3. Clear Elevation Separation:** Are the plateau grass tiles (Col 4) visibly darker, cooler, and greener (alpine sage-moss) than the warm valley grass (Cols 1–3)?
- [ ] **4. 48° Camera & Cliff Alignment:** Do all cliff faces, corners, and ramp ends share the consistent 48° high three-quarter angle? Do the straight cliff, corners, and ramp tops align at ~160 px height?
- [ ] **5. Calligraphic Waterfall & Water:** Is the water muted verdigris/slate with fine ripple strokes? Is the waterfall composed of calligraphic line streams and chalk foam rather than opaque white rectangular blocks?
- [ ] **6. Grid Integrity & Clean Separation:** Are all 24 subjects strictly confined to their 256 × 256 cells without bleeding across boundaries? Are cutout sprites on clean white or transparent backgrounds?

---

## 8. Cutting Plan for Downstream Worker

A later worker cutting this sheet with **Sharp** will execute the following automated steps:

### 8.1 Slicing Coordinates

```javascript
const SHEET_CONFIG = {
  canvasWidth: 1536,
  canvasHeight: 1024,
  cols: 6,
  rows: 4,
  cellWidth: 256,
  cellHeight: 256,
};

function getCellCrop(col, row) {
  return {
    left: col * SHEET_CONFIG.cellWidth,
    top: row * SHEET_CONFIG.cellHeight,
    width: SHEET_CONFIG.cellWidth,
    height: SHEET_CONFIG.cellHeight,
  };
}
```

### 8.2 Downsampling and Processing

1. **Ground Tiles (Row 1, Row 3):**
   - Extract 256 × 256 cell.
   - Resize 50% using `sharp(buffer).resize(128, 128, { kernel: sharp.kernel.lanczos3 })`.
   - Save to `public/art/orkhon-valley/ground/<tile_name>.png`.
   - Check edge repeat: verify column 0 matches column 127, row 0 matches row 127 per `seam()` in `scripts/measure-art.mjs`.

2. **Cliff and Ramp Sprites (Row 2):**
   - Extract cell, trim background alpha.
   - Downsample 50% to target billboard dimensions (128 px width, ~160 px wall height).
   - Set anchor / pivot: bottom-center `(0.5, 1.0)`.

3. **Waterfall Kit (Row 4):**
   - Top Lip: anchor top-center `(0.5, 0.0)` for alignment with plateau rim.
   - Cascade Curtain: anchor top-center `(0.5, 0.0)`.
   - Plunge Pool: anchor center `(0.5, 0.5)` on riverbed surface.

---

## 9. Multi-Sheet Feasibility Note

### Why One Sheet is Feasible and Preferred

1. **Resolution:** A 1536 × 1024 sheet provides 256 × 256 px per cell. Because game tiles are 128 × 128 px, the sheet provides **2× supersampled master resolution**, which is ideal for downsampling.
2. **Style Consistency:** Generating the entire kit in a single GPT Image prompt guarantees identical parchment paper tone, ink line weight, and mineral pigment saturation across every tile and cliff piece.

### Optional 2-Sheet Split (If Needed)

If GPT Image has difficulty separating 24 distinct cells in a single generation, split into two 1536 × 1024 sheets using the identical style instructions:

- **Sheet 1 — Ground & Water Kit (4 columns × 3 rows, 384 × 341 px cells):**
  - Row 1: Valley Grass Base, Valley Grass Warm, Valley Grass Muted, Plateau Grass.
  - Row 2: Dirt Trail, Scree, River Channel, River Bend.
  - Row 3: River South Bank, River North Bank, Bridge Abutments, Rapids.
- **Sheet 2 — Cliff & Elevation Kit (4 columns × 3 rows, 384 × 341 px cells):**
  - Row 1: Cliff Straight Run, Cliff Outer Corner, Cliff Inner Corner, Cliff Pillar.
  - Row 2: Cliff Ramp Left Flank, Cliff Ramp Right Flank, Cliff Ramp Surface, Cliff Talus Rocks.
  - Row 3: Waterfall Top Lip, Waterfall Curtain, Waterfall Plunge Pool, River Islet Stone.
