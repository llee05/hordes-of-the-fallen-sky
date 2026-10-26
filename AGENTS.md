# Working on Hordes of the Fallen Sky

Hordes of the Fallen Sky is a nomadic civilization builder and desktop TypeScript/Phaser 3 bullet heaven, rendered with Vite and packaged with Electron for a future Steam release. Read `README.md` and `steam/README.md` for setup and file locations.

## Development loop

- `npm run dev`: desktop game with hot reload. `npm run dev:web`: optional browser preview.
- `npm run build` / `npm start`: compile and launch the offline desktop game.
- `npm run package:linux` / `npm run package:win`: complete Steam depot content under `release/`.
- `npm run format`: format source and documentation.
- `npm run check`: formatting, strict renderer/desktop type checking, unit tests, and production build.
- `npm run test:desktop`: actual Electron smoke test with isolated saves; requires a display or Xvfb on Linux.
- `npm run test:e2e`: visible browser regression tests requiring a display and hardware WebGL locally. Install Chromium or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; `CI` or `E2E_HEADLESS=1` keeps headless software rendering.

## Commit workflow

- Split every task into appropriately sized, focused commits. Plan the logical pieces before editing, and commit each completed working milestone separately. Maintain a playable build throughout development and at every committed milestone.
- Keep each commit coherent and reviewable, with its related code, tests, and documentation together. Use clear commit messages that describe the change.
- Run the checks appropriate to each change before committing. Stage only work belonging to that commit; preserve unrelated user changes.

## Art style: The Living Steppe Tapestry

- Follow a stylized, painterly 2.5D direction: the readable miniature scale of Thronefall, the illustrated silhouettes of The Banner Saga, and the materials and geometric ornament of traditional Mongolian and Central Asian art. Create original designs with matte painted surfaces, restrained brush grain, and clear silhouettes.
- Build the living steppe around golden ochre and sage grasslands, miniature chestnut horses, ivory felt gers, decorated wooden carts, and turquoise and vermilion banners. Use lapis, rust, olive, umber, and warm brass as supporting colors. Give supernatural creatures unsettling ash, bone, stone, and indigo forms with restrained turquoise light.
- Keep a consistent high three-quarter view, warm light from the upper left, and soft olive ground shadows. Sort sprites by ground position and keep terrain quiet enough for enemies, projectiles, and danger warnings to remain readable.
- Match the interface to the world: indigo felt, warm manuscript paper, brass symbols, rust-red woven trim, stitched borders, and serif chapter titles. Reuse painted world assets in camp and chronicle illustrations. Preserve text contrast, visible focus, and a clear battlefield; decorative art must not obstruct controls.
- Animate characters with grounded gaits, subtle idle movement, readable attacks, and brief hit and defeat feedback. Keep proportions, shared frame registration, and ground anchors stable. Character animation follows active gameplay time; interface motion stays subtle, respects reduced-motion preferences, and never delays an action or displayed value.
- Keep painted PNGs and atlas metadata in `public/art/`. Use `src/game/assets/painterlyArt.ts` for loading and visual sizing, `src/ui/artwork.ts` for interface illustrations, and `src/tapestry.css` and `src/motion.css` for UI materials and motion. Preserve transparent gutters and frame metadata when extending atlases, and inspect new poses in the game.
- Keep antialiasing, linear texture filtering, and fractional sprite positions enabled for the painted artwork. Bundle all images and fonts locally; do not fetch assets at runtime.
- Read [the visual direction and asset prompts](docs/living-steppe-tapestry.md) and [the character animation guide](docs/character-animation.md) before changing artwork or animation sheets.

## Code conventions

- Keep gameplay rules in small, independently testable TypeScript modules. Prefer plain structured content definitions over editor-only configuration.
- Keep strict TypeScript settings enabled for the renderer and desktop. Run automated tests and `npm run check` for every significant change.
- Whenever behavior changes, document the affected interfaces and update the relevant automated tests in the same commit.
- Gameplay time is in **seconds**. Convert Phaser's millisecond update delta at the boundary.
- Store enemy definitions, technology upgrades, and faction bonuses as structured data. Keep balance values in `src/game/config.ts`, enemies in `data/enemies.ts`, patron metadata in `data/patrons.ts`, technologies in `data/upgrades.ts`, and clan content in `data/clan.ts`.
- Use `lore.md` as the narrative reference, including its canonical intro script and sourced writing boundaries. Keep the fictional Sundering and creatures distinct from historical Tengri traditions; preserve the clan-survival stakes when extending the story.
- Keep renderer-independent progression in `state/run.ts`, `state/khan.ts`, `state/clan.ts`, `state/camp.ts`, `state/patrons.ts`, and `state/story.ts` for fast unit testing. Story definitions live in `data/story.ts`; resolve dialogue once on opening, grant each choice at most once, and retain the actual transcript and outcome in the run's chronicle.
- `ArenaScene` owns simulation. `GameUI` receives snapshots and sends user actions; do not duplicate game state in the DOM.
- Respect run phases: simulation and physics stop during intro, camp story, epilogue, story log, ready, pause, upgrades, planning, chronicle, settings, help, death, and victory. Keep menu transitions in ArenaScene; use ActionKeys to consume each one-shot native key event once, including when Phaser replays its event queue. Keep intro chapter state in the scene; New Game opens the prologue, and skipping or completing it begins the expedition. Replaying the introduction from the title returns to the title without starting gameplay. Read-only story logs return to their original paused or ended phase, and story completion preserves banked knowledge points. Level-ups bank points without opening a menu; the tech tree is opened explicitly and can close with points unspent.
- The player character is the Khan. Lethal hits start active-time succession in `state/khan.ts` after Last Ember is spent; only clan loss ends the expedition. Disable the fallen Khan’s body, movement, personal attacks, collection, and healing while camp defenses continue. Menus freeze succession. Successors return to the current camp/caravan with inherited progression, full health, and configured protection; arrivals and healing must not bypass the timer or refresh Last Ember.
- Actors are pooled. Reset mutable properties on reuse and disable bodies in collision callbacks.
- Drive character frames and defeat copies from active gameplay seconds through `animation/CharacterMotion.ts` and `animation/CharacterVisuals.ts`. Preserve the shared logical canvas and ground registration, visual scale, and collision offsets when changing frames; do not use automatic animation clocks that continue in menus.
- Preserve XP at pool capacity, upgrade stack limits, excess XP, and every earned knowledge point. Build progression panels through the shared renderer in `src/ui/progressionTree.ts`; author patron metadata, ranks, prerequisites, and categories in content data instead of fixed UI slots. Patron technologies use one card per technology with repeatable ranks and prerequisite-derived tiers. Keep neutral patron defaults in `state/patrons.ts`, and drive bounded ancestral riders, terrain fields, and camp wards through active seconds in `systems/PatronSupport.ts`. Camp developments use stable IDs, local prerequisite IDs, optional exclusive groups and costs, and data-defined purchase effects; preserve `hasDevelopment` checks when extending content.
- Author ongoing camp benefits through typed `effects` in building/development definitions; `state/camp.ts` applies them once to `clan.campEffects` after a validated purchase. Keep new camp balance in `GAME.camp`, pay arrival bonuses only on crossing completion, and preserve shared crafts, multi-parent requirements, descendant exclusion, worker reservation, and patron stacking. `clan.buildings` counts establishment plus learned developments; it is not a fixed two-level specialization enum. See `docs/camp-upgrade-tree.md` for the complete catalog and cultural sources.
- Use `GamePlatform` for saves and OS capabilities. Native files are validated/serialized/atomically renamed through `ProfileStore`. Do not write to the install directory or use localStorage for desktop persistence.
- Preserve the sandbox, context isolation, disabled renderer Node integration, trusted sender checks, and typed preload bridge. Never expose raw IPC, filesystem paths, arbitrary file access, or process execution to the renderer.
- Node ESM imports in desktop/shared modules use `.js` extensions. The sandboxed preload is `.cts` compiled to `.cjs`.
- Package only staged build files. Do not include source, hidden directories, test files, credentials, or development dependencies.
- Steam preparation must remain separate from uploads. Real App/depot IDs come from environment variables, and generated VDFs default to Preview mode without SetLive. Do not add fake Steam integration or assume an App ID.
- Test meaningful progression, save, lifecycle, targeting, and input changes. Verify desktop layout in Electron and preserve the browser regression suite.
- Keep `window.__gloam` development-only. No backend, API keys, or runtime AI calls unless a feature needs them.
