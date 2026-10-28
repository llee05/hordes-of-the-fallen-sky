# Patron research tapestry artwork

The research screen follows the Living Steppe Tapestry direction: a painted
travelling-clan masthead, teal felt patron navigation, woven brass/rust trim with
crest tassels, parchment technology cards, illustrated patron regions and matching
inspector headers. Existing patron descriptions provide the creed beside the name
and domain. Every technology keeps its own existing symbol, rank indicators,
status, prerequisite lines, focus state and purchase validator.

## Bundled artwork

`public/art/research/` contains **51 WebPs, 2,510,954 bytes (2.39 MiB)**. The shared
header is 58,400 bytes. Each region has one 1280-pixel-wide landscape, a
560-pixel-wide detail crop, and three 168×104 vignette crops. Vignettes cycle within
each patron; they are **per-patron sets, rather than unique paintings per
technology**. Matching detail art and vignettes come from the same generated
painting, keeping the region visually consistent without another large download.

| Region                      | Theme                                                       | All five files (bytes) |
| --------------------------- | ----------------------------------------------------------- | ---------------------: |
| Börte Chino                 | Wolves, hunters, golden grass, river valley                 |                278,576 |
| Etügen Eke                  | Grazing herds, households and fertile pasture               |                289,588 |
| Khükhedei Mergen            | Mounted archers, eagle and feathered arrows                 |                259,962 |
| Golomt                      | Ember bearers and a sheltered hearth at dusk                |                144,766 |
| Lus                         | Braided turquoise river, reeds and stony banks              |                293,382 |
| Ongod                       | Ancestral riders beside the living, standing stones         |                158,474 |
| Sülde                       | Clan standards, mounted host and protected wagons           |                238,364 |
| Guardian of Burkhan Khaldun | Mountain shelter, timber defenses, watchfires               |                235,528 |
| General research            | Maps, manuscript, instruments and travelling scholar's camp |                209,866 |
| Hybrid discoveries          | Meeting trails, wolves, eagle and ancestral riders          |                344,048 |

`src/ui/researchArtwork.ts` authors local URLs relative to Vite's base URL, including
static browser deployments under a project subpath. CSS-variable image URLs are
resolved against the document base so Electron never looks under `assets/art/`. `TreeBranch.artwork` is
optional so other progression consumers keep their existing presentation.
`progressionTree.ts` emits image styles only for the selected branch and inspector.
Navigation and overview retain their distinct SVG symbols without loading regional
paintings. The browser fetches the selected region's five files on demand and caches
them between selections. No renderer preload, Phaser texture load, network service,
AI call, or gameplay state is added. `src/research.css` scopes the materials and
responsive layout to `[data-tree-kind='patrons']`; artwork is decorative and adds no
focus targets or motion.

## Generation and production

All eleven originals were created with the **built-in image_gen tool**. No extra
candidates were generated. Production conversion used ImageMagick: strip metadata,
resize the landscapes to width 1280, and encode WebP at quality 75. Detail and
vignette crops are taken from the same originals. The large source PNGs remain in
the generation/proof archive outside the shipped game; only the compressed assets
are bundled. None of these images are character sheets or alter sprite registration.

Every prompt used this common specification:

> Use case: stylized-concept. Asset type: production painted research UI landscape for Hordes of the Fallen Sky. Original Mongolian-inspired Living Steppe Tapestry, matte gouache, restrained brush grain, illustrated silhouettes, warm upper-left sunlight, ochre and sage steppe, lapis/indigo, turquoise and vermilion accents, warm manuscript edges. Wide landscape composition, 1536x1024. Quiet central field for parchment research cards; rich narrative scenery at edges and upper right. No lettering, UI, numbers, watermark, modern objects or realistic photography.

The following subject text completed each prompt:

- **Börte Chino:** Börte Chino, Hunting: a grey wolf in long golden grass at upper right, lone wolf on left crag, distant river valley with miniature mounted hunters and an eagle, ivory gers and blue standards. Warm ochre, sage and slate.
- **Etügen Eke:** Etügen Eke, Civilisation: fertile rolling green-gold pastures, grazing sheep and horses, ivory felt gers, families tending grain and decorated wooden supply carts; abundant earth, sheltered gardens and distant hills. Sage, olive and brass.
- **Khükhedei Mergen:** Khükhedei Mergen, Archery: mounted steppe archers loosing arrows across a sweeping golden plateau, eagle soaring over distant blue mountains, recurved bow and feathered arrows resting beside a rock in foreground. Lapis, brass and ivory.
- **Golomt:** Golomt, Survival: a warm sheltered hearth camp at dusk, women and elders carrying a glowing ember bowl beside ivory gers, small watchfires and a felt-wrapped shelter, vermilion and copper warmth against blue hills.
- **Lus:** Lus, Terrain: sweeping turquoise braided river valley through sage pasture, polished river stones, reeds, willow trees, stepped rocky banks and quiet flowing currents, distant mountain rain. Restrained turquoise light in the water, no humanoid deity.
- **Ongod:** Ongod, Summoning: remembered ancestral mounted archers as subtle translucent indigo and turquoise silhouettes riding beside living chestnut horses, ancient standing stones on a misty steppe under stars, bone and ivory details; solemn fictional fantasy, no invented sacred ritual.
- **Sülde:** Sülde, Leadership: tall turquoise and indigo clan standards with brass finials and flowing horsehair, organized mounted host protecting decorated wooden wagons and ivory gers, far riders in sunlit dusty steppe. Vermilion trim and warm brass.
- **Guardian:** Guardian of Burkhan Khaldun, Construction: great mountain crags and cedar foothills sheltering a tiny nomadic camp, lashed timber defenses, stacked building materials, warm watchfires at a held passage. Stone, olive, umber and ivory; fictional guardian suggested by mountain silhouette, no literal deity.
- **General:** General Research, Expedition: a quiet travelling scholar's camp in an open golden steppe, rolled manuscript maps, an open illustrated book, brass compass and measuring tools on felt at lower left, supply carts and explored winding paths to distant hills. Warm parchment and sage.
- **Hybrid:** Hybrid Discoveries: a crossroads of two steppe rivers and two caravan trails, wolf and eagle sharing the horizon, horse archers beside luminous ancestral riders, campfires and blue banners joining into a single traveling host. Turquoise, indigo, rust and brass; original fantasy discoveries.
- **Header:** A panoramic steppe clan banner illustration: riders on miniature chestnut horses, ivory felt gers, decorated wooden carts, indigo standards with turquoise and vermilion trim, soaring eagle, distant blue mountains and golden grass. Subject clustered on right two-thirds; left third pale warm manuscript negative space for a title. Horizontal painted UI header, no text, no UI.
