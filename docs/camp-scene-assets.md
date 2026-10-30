# Khan's camp scene assets

The Khan's camp management screen is a composited painting in the manner of an illustrated estate map. It has one quiet landscape and a separate illustration for every building level, so constructing or upgrading a building changes its artwork. All images are local WebP files in `public/art/camp-scene/`. The game never generates or downloads art at runtime.

## Layout

`src/ui/campScene.ts` owns the layout. The scene has a fixed 2:1 aspect ratio, and every site anchor is a percentage of it:

- `x` and `y` give the ground point at the bottom centre of the illustration.
- `width` is the illustration width as a percentage of the scene width.

The five permanent buildings have fixed sites around the Khan's Ger at the centre. The five optional sites belong to the persistent slot indexes in `clan.nomadicCamp.slots`, so any of the fourteen workplaces can stand on any optional site. A few tall workplaces are drawn narrower so their silhouettes stay in proportion. Layers follow the ground line, so nearer buildings overlap buildings behind them. Every parchment label sits just below its building's ground line and always draws above the artwork.

The map scales to fit the space inside the frame, down to 760 px wide. Narrower windows pan the map horizontally, as before. Labels keep a fixed readable text size.

## Asset slots

Every file below is a replaceable slot. A replacement must keep the same file name, transparent background, viewpoint, upper-left light and bottom-centre ground point. All levels of one building share the same canvas size, so the ground point and scale stay the same between levels.

| File                               | Content                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `background.webp`                  | 1376 × 688 empty steppe with distant hills, paths and clearings |
| `<building-id>-1.webp` … `-3.webp` | Building levels 1–3 for each of the 19 building IDs             |
| `empty-site-1.webp` … `-5.webp`    | Subtle unclaimed plot for optional sites 1–5                    |

The building IDs are the five permanent buildings (`khans-ger`, `horse-lines`, `herding-grounds`, `communal-hearth` and `wagon-yard`) and the fourteen optional buildings in `OPTIONAL_CAMP_BUILDINGS` (`src/shared/nomadicCamp.ts`). There are 63 files in total, about 2 MB.

## Production

The images were made with the built-in image generation tool. Building sheets used the finished Khan's Ger sheet as a style reference. Each sheet shows the three levels of one building side by side on flat magenta. A local ImageMagick step then:

1. removes the magenta background and its colour fringe;
2. removes any thin ground line;
3. splits the levels at the empty gaps between them;
4. places all levels of the building on one shared canvas aligned at the bottom centre;
5. saves each level as a WebP with transparency.

Common sheet brief:

> Flat, uniform pure magenta #FF00FF background with no ground, grass, cast shadow, ground line or horizon. Three isolated illustrations side by side for levels 1, 2 and 3, each centred in its third, with clear magenta gaps. The same place at three successive upgrade levels, at the same scale and from the same slightly elevated three-quarter view, bases on one invisible baseline. Higher levels are more developed but remain portable nomadic structures. Traditional 2D medieval manuscript illumination: matte gouache and watercolour, delicate brown ink outlines, muted earthy palette (ivory felt, weathered umber wood, ochre, olive, sage) with restrained lapis blue, gold and vermilion accents, and Mongolian and Central Asian nomadic design. Compact and uncluttered with a clear silhouette. At most one small stylised figure where stated. No photorealism, 3D-render look, sharp hyper-detail, text, numbers or labels.

Building content by level:

| Building                  | Level 1                            | Level 2                                      | Level 3                                                  |
| ------------------------- | ---------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Khan's Ger                | Large ivory ger with blue pennant  | Ornate gilded doorway, side ger, two banners | Palace ger on platform, gold finial, horsetail standards |
| Horse Lines               | Rope line with two horses          | Longer line, saddle rack, trough             | Timber corral, saddle stand, hay, groom                  |
| Herding Grounds           | Wicker windbreak, sheep and goats  | Wicker fold with shepherd's shelter          | Double fold, yaks, hay, milking stand, herder            |
| Communal Hearth           | Fire ring, cauldron, log seats     | Felt sunshade canopy, rugs                   | Feasting pavilion, two cauldrons, cook                   |
| Wagon Yard                | One covered cart                   | Two carts and chests                         | Ger-cart and decorated carts                             |
| Archery Range             | Two straw targets                  | Three targets, bow rack                      | Striped judges' canopy, pennants                         |
| Smith's Forge             | Clay hearth, bellows, anvil        | Timber lean-to, tools, quench barrel         | Forge cart with chimney, weapon rack, smith              |
| Warrior's Training Ground | Straw training posts, spear rack   | Log sparring ring, shields                   | Wrestling ring, armour stand, pennants, warrior          |
| Scout's Watchpost         | Lookout pole and tethered horse    | Raised platform with ladder                  | Watchtower with banner and brazier, scout                |
| Fletcher's Workshop       | Workbench with shafts and feathers | Small ger with arrow racks                   | Ger workshop with awning, quivers, fletcher              |
| Palisade & Watchfires     | Row of stakes, fire basket         | Curved palisade, two watchfires              | Palisade gate, braziers, vermilion banners               |
| Hunting Lodge             | Hide lean-to, drying rack          | Conical hide hut with antlers                | Lodge ger, antler gate, falcon, hunter                   |
| Artisan's Ger             | Small ger with felt rolls          | Felt-making area, loom                       | Dyeing vats and hanging textiles, weaver                 |
| Trading Post              | Merchant cart                      | Awning stall with carpets                    | Caravan market, camel, merchant                          |
| Healer's Ger              | Small ger with herb bundles        | Herb racks and plot                          | Blue-banded ger, medicine chests, healer                 |
| Sacred Ovoo               | Small cairn with blue scarf        | Stepped cairn with poles                     | Grand cairn with offerings and smaller cairns            |
| Shaman's Ger              | Dark felt ger with drum            | Ribbon poles                                 | Ribbon tree, drum stand, bronze discs                    |
| Ancestral Standard        | One horsetail standard             | Three standards on a platform                | Great standard on a dais in a ring of standards          |
| Storyteller's Hearth      | Campfire, logs, horse-head fiddle  | Felt canopy, rugs, cushions                  | Pavilion with carpets, scrolls, storyteller              |

Empty sites, on one five-cell sheet: survey stakes and a rope square; a trodden oval ringed with stones; stakes with a blue marker and stacked poles; a pegged rope circle with rolled felt; flat stones with a marker pole and a faded red ribbon.

Background brief:

> Wide 2:1 production background: an empty steppe meadow where a Mongolian nomadic camp will be placed. Traditional 2D manuscript illumination in matte gouache and watercolour on warm parchment, delicate brown ink outlines, faint parchment grain, muted earthy palette with tiny touches of lapis, gold and vermilion in wildflowers. Slightly elevated three-quarter view, warm light from the upper left. A band of low distant hills fades into parchment haze at the top. There are no buildings, people or animals. Ten quiet clearings, with the largest at the centre, are joined to the centre by winding pale footpaths. Sparse shrubs, rocks and a thin stream; small trees only near the edges. Nothing large near the borders. No text, frame or watermark.

The background was generated at 16:9 and cropped to 2:1.
