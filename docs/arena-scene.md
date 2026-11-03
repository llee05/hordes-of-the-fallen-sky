# Arena scene structure

`src/game/scenes/ArenaScene.ts` is the arena's coordinator. It owns the Phaser lifecycle,
the order of each simulation step, the public API that `GameUI` calls, and every menu and
phase transition. Focused scene systems in `src/game/scenes/arena/` hold the rest. Rules
stay in renderer-independent `state/` modules; scene systems only drive Phaser objects and
call those rules. The split is in progress, so most combat and battlefield code still lives
in the scene.

## Modules

| Module                   | Owns                                                                                                       | Lifetime                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| `ArenaScene.ts`          | lifecycle, `update` order, public API, menus and phases, capture/restore composition, test-hook forwarders | scene                    |
| `arena/ArenaContext.ts`  | the shared world: live getters over the scene's run, timers and world objects                              | scene                    |
| `arena/ArenaTimers.ts`   | the nine saved timers as one record (`WorldArchive['timers']`)                                             | scene, reset in `create` |
| `arena/ArenaEffects.ts`  | spark bursts and dust puffs                                                                                | scene                    |
| `arena/HudPresenter.ts`  | the HUD snapshot, combat-readability markers, camp pressure, and the shared `bearingArrow` helper          | scene                    |
| `arena/CampPresenter.ts` | camp drawing, the barrier, clan life, banner sway, the camp label, and the gers that fade on departure     | each `create`            |
| `arena/ArenaInput.ts`    | key, wheel, touch and controller bindings, the movement intent, and the touch joystick                     | scene, bound in `create` |

"Scene" lifetime means one instance for the scene object. Field initialisers run once, but
`create` runs on every `scene.restart`, so per-run state is reset there. `ArenaInput` must
survive a restart: it keeps the scene's single `GamepadInput` and `ActionKeys`. A new
controller would forget held buttons, so a held confirm or back would fire again after a
load, and a new `ActionKeys` would lose the dedupe for key events Phaser replays. The scene
removes all keyboard listeners on shutdown and `bind` adds them again.

## Shared context

Systems receive one `ArenaContext`. Every member is a getter over the scene, so a system
always sees the current `run` and the world objects the latest `create` built. Never store
`run` in a system: New Game, Load, Continue Camp and a tradition change all replace it.

## Saved timers

`spawnTimer`, `attackTimer`, `dashTimer`, `dashRemaining`, `invulnerable`, `supportTimer`,
`wagonTimer`, `wardTimer` and `hazardTimer` live in one `ArenaTimers` record. Capture copies it
(`{ ...timers }`) and restore assigns into it (`Object.assign(timers, saved)`). A timer moved
onto a separate field would load into a field nobody reads, and the save would still look valid.

## Simulation order

`update` converts Phaser's millisecond delta to seconds, caps a step at 0.05 s, and runs the
steps below in this order. The order is behaviour: moving a step changes play.

1. Controller polling and menu dispatch (`ArenaInput.pollController`); stop unless the phase is still `playing`.
2. Present a queued story; observe expedition and research metrics; begin succession if the Khan fell.
3. Advance elapsed time, campfire vigil and patrons; decay dash, invulnerability and gallop.
4. Advance the clan: finish on loss or victory, or arrive at the next camp.
5. Select the nearest companion; `updateCamp` (camp drawing, then riders, terrain and hazards).
6. Clan integrity check; advance succession and mounted combat; move the Khan or pin him to camp.
7. Audio; field state and area encounter sync; encounter pacing.
8. Field objectives, crossing, final stand, enemies; clan integrity check.
9. Spatial index rebuild; camp defences; patron support; Khan and rider fire; spawning.
10. Projectiles; gem collection; area combat; autosave; clan integrity check.
11. Character animation; HUD refresh; final boss spawn; present a queued story.

Every phase other than `playing` stops simulation and physics.

## Browser test hooks

In development builds `window.__gloam.scene` exposes the scene, and many browser tests read,
assign or call its members by name. `tests/e2e/scene-hooks.spec.ts` lists those names and their
kinds. When code moves into a system, keep each listed name working through a forwarder in the
scene's test-hook block at the end of the class. Declare forwarders that only tests use without
`private`, because `noUnusedLocals` rejects unused private members.
