# Working on Hordes of the Fallen Sky

Hordes of the Fallen Sky is a nomadic civilization builder and desktop TypeScript/Phaser 3 bullet heaven, rendered with Vite and packaged with Electron for a future Steam release. Read `README.md` and `steam/README.md` for setup and file locations.

## Development loop

- `npm run dev`: desktop game with hot reload. `npm run dev:web`: optional browser preview.
- `npm run build` / `npm start`: compile and launch the offline desktop game.
- `npm run package:linux` / `npm run package:win`: complete Steam depot content under `release/`.
- `npm run format`: format source and documentation.
- `npm run check`: formatting, strict renderer/desktop type checking, unit tests, and production build.
- `npm run test:desktop`: actual Electron smoke test with isolated saves; requires a display or Xvfb on Linux.
- `npm run test:e2e`: browser regression tests. Install Chromium or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Commit workflow

- Split every task into appropriately sized, focused commits. Plan the logical pieces before editing, and commit each completed piece separately.
- Keep each commit coherent and reviewable, with its related code, tests, and documentation together. Use clear commit messages that describe the change.
- Run the checks appropriate to each change before committing. Stage only work belonging to that commit; preserve unrelated user changes.

## Code conventions

- Prefer focused typed modules and plain content definitions over editor-only configuration.
- Gameplay time is in **seconds**. Convert Phaser's millisecond update delta at the boundary.
- Keep balance values in `src/game/config.ts`, enemies in `data/enemies.ts`, traditions in `data/upgrades.ts`, and clan content in `data/clan.ts`.
- Keep renderer-independent progression in `state/run.ts` and `state/clan.ts` for fast unit testing.
- `ArenaScene` owns simulation. `GameUI` receives snapshots and sends user actions; do not duplicate game state in the DOM.
- Respect run phases: simulation and physics stop during ready, pause, upgrades, planning, chronicle, settings, help, death, and victory. Keep menu transitions in ArenaScene; use ActionKeys to consume each one-shot native key event once, including when Phaser replays its event queue.
- Actors are pooled. Reset mutable properties on reuse and disable bodies in collision callbacks.
- Preserve XP at pool capacity, upgrade stack limits, excess XP, and every earned upgrade choice.
- Follow The Living Steppe Tapestry art direction: painterly 2.5D sprites, warm golden terrain, textile-inspired ornament, soft shadows, and ground-position depth sorting. Painted assets and atlas metadata live in `public/art/`; loading, visual sizing, and effects live in `assets/painterlyArt.ts`. Keep antialiasing and linear filtering enabled. Bundle all images and fonts locally; do not fetch them at runtime.
- Use `GamePlatform` for saves and OS capabilities. Native files are validated/serialized/atomically renamed through `ProfileStore`. Do not write to the install directory or use localStorage for desktop persistence.
- Preserve the sandbox, context isolation, disabled renderer Node integration, trusted sender checks, and typed preload bridge. Never expose raw IPC, filesystem paths, arbitrary file access, or process execution to the renderer.
- Node ESM imports in desktop/shared modules use `.js` extensions. The sandboxed preload is `.cts` compiled to `.cjs`.
- Package only staged build files. Do not include source, hidden directories, test files, credentials, or development dependencies.
- Steam preparation must remain separate from uploads. Real App/depot IDs come from environment variables, and generated VDFs default to Preview mode without SetLive. Do not add fake Steam integration or assume an App ID.
- Test meaningful progression, save, lifecycle, targeting, and input changes. Verify desktop layout in Electron and preserve the browser regression suite.
- Keep `window.__gloam` development-only. No backend, API keys, or runtime AI calls unless a feature needs them.
