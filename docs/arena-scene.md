# Arena scene structure

`src/game/scenes/ArenaScene.ts` is the arena's coordinator. It owns the Phaser lifecycle,
the order of each simulation step, the public API that `GameUI` calls, and every menu and
phase transition. Focused scene systems in `src/game/scenes/arena/` hold the rest. Rules
stay in renderer-independent `state/` modules; scene systems only drive Phaser objects and
call those rules. The split is in progress: the combat core, area combat, hazards and camp
defences have moved, while the final-stand director and enemy animation still live in the scene.

## Modules

| Module                            | Owns                                                                                                                                                                                                                         | Lifetime                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `ArenaScene.ts`                   | lifecycle, `update` order, public API, menus and phases, capture/restore composition, test-hook forwarders                                                                                                                   | scene                              |
| `arena/ArenaContext.ts`           | the shared world: live getters over the scene's run, timers and world objects                                                                                                                                                | scene                              |
| `arena/ArenaTimers.ts`            | the nine saved timers as one record (`WorldArchive['timers']`)                                                                                                                                                               | scene, reset in `create`           |
| `arena/ArenaEffects.ts`           | spark bursts and dust puffs                                                                                                                                                                                                  | scene                              |
| `arena/HudPresenter.ts`           | the HUD snapshot, combat-readability markers, camp pressure, and the shared `bearingArrow` helper                                                                                                                            | scene                              |
| `arena/CampPresenter.ts`          | camp drawing, the barrier, clan life, banner sway, the camp label, and the gers that fade on departure                                                                                                                       | each `create`                      |
| `arena/ArenaInput.ts`             | key, wheel, touch and controller bindings, the movement intent, and the touch joystick                                                                                                                                       | scene, bound in `create`           |
| `arena/ArenaPersistence.ts`       | the save queue and generation guard, checkpoints, camp saves, autosave, and load/delete status                                                                                                                               | scene, reset in `create`           |
| `arena/EnemyDirector.ts`          | spawning and initialising pooled enemies, their ground shadows, the Skybreaker reference, the spawn and final-boss ticks, and enemy-pool capture/restore                                                                     | scene, reset in `create`           |
| `arena/ClanDamage.ts`             | the single path for battlefield damage to the clan and the development clan-invincible cheat; callers pass the impact point, which no rule reads yet                                                                         | scene                              |
| `arena/CombatSystem.ts`           | Khan volleys and the attack timer, friendly and hostile projectiles, hits, enemy damage and defeat rewards, gem collection, the physics overlaps, and saved projectiles                                                      | scene                              |
| `arena/RiderHost.ts`              | the 16 rider slots, formation movement, rider volleys, rider animation, terrain reconciliation, and saved rider positions                                                                                                    | scene, reset in `create`           |
| `arena/KhanController.ts`         | Khan riding, the gallop, taking damage, falling and a successor's return, the ground shadow and aura, Khan animation, and the saved Khan body                                                                                | scene, reset in `create`           |
| `arena/EnemyBehaviour.ts`         | each enemy's per-frame steps: warnings, barrier contact, timers, despawning, targeting, movement and charges, camp attacks, ranged volleys, abilities, seer marks (drawn and resolved by `Hazards`), gallop and fire effects | scene                              |
| `arena/AreaCombat.ts`             | the current area's encounter pacing and threats: placing terrain threats, resolving threat hits on the Khan and camp, and drawing threats and high-contrast hostile-shot rings; saved area encounter and threats             | scene, rebuilt in `create`         |
| `arena/Hazards.ts`                | delayed danger circles (late-region eruptions under the Khan and hollow seers' marks), their strikes on the Khan and camp, and saved hazards                                                                                 | scene, reset in `create`           |
| `arena/CampDefences.ts`           | the camp's own defences on their saved timers: sanctuary lightning, wagon volleys and the ancestral ward                                                                                                                     | scene                              |
| `arena/FieldObjectiveDirector.ts` | placing field objectives around camp, raising a gathering's guards, escorting returning objectives, and the field marker, whose warning surface the other markers and enemy warnings share                                   | scene, markers rebuilt in `create` |
| `arena/CrossingDirector.ts`       | crossing encounters during migration: placing the refugee escort, spawning route guards, escorting refugees to the caravan, and the crossing marker                                                                          | scene, marker rebuilt in `create`  |
| `arena/ArenaSystem.ts`            | base class whose getters read the shared context live, so moved code keeps its `this.run`/`this.player` shape                                                                                                                | —                                  |

"Scene" lifetime means one instance for the scene object. Field initialisers run once, but
`create` runs on every `scene.restart`, so per-run state is reset there. `ArenaInput` must
survive a restart: it keeps the scene's single `GamepadInput` and `ActionKeys`. A new
controller would forget held buttons, so a held confirm or back would fire again after a
load, and a new `ActionKeys` would lose the dedupe for key events Phaser replays. The scene
removes all keyboard listeners on shutdown and `bind` adds them again.

`ArenaPersistence` also survives a restart: it keeps the pending write and the save generation.
`reset` increments the generation, dropping saves that have not started and preventing
completion handlers for in-flight saves from updating the new session. A platform write
already in flight can still finish.

## Enemy pool identity

The enemy pool's slot order is part of a save's identity. Projectile hit records, area-threat
owners (`slot:spawnId`) and tactical slots all name enemies by pool slot, and each slot keeps a
generation (`spawnId`) that grows on every spawn. `EnemyDirector.restorePool` recreates every
saved slot in order, active or not, so restore must rebuild the pool before projectiles.

## Shared context

Systems receive one `ArenaContext`. Replaceable state is exposed through getters over the
scene, so a system always sees the current `run` and the world objects the latest `create`
built. Never store `run` in a system: New Game, Load, Continue Camp and a tradition change
all replace it.

## Saved timers

[`ArenaTimers`](../src/game/scenes/arena/ArenaTimers.ts) aliases the saved timer schema in
[`WorldArchive`](../src/game/state/expeditionArchive.ts). Capture copies the record
(`{ ...timers }`) and restore assigns into it (`Object.assign(timers, saved)`). A timer moved
onto a separate field would load into a field nobody reads, and the save would still look valid.

## Simulation order

`update` converts Phaser's millisecond delta to seconds, caps a step at 0.05 s, and runs the
steps below in this order. The order is behaviour: moving a step changes play.

1. Controller polling and menu dispatch (`ArenaInput.pollController`); stop unless the phase is still `playing`.
2. Present a queued story; observe expedition metrics; begin succession if the Khan fell.
3. Advance elapsed time, camp recovery; decay dash, invulnerability and gallop.
4. Advance the clan: finish on loss or victory, or arrive at the next camp.
5. Select the nearest companion; `updateCamp` (camp drawing, then rider formation, terrain and hazards).
6. Clan integrity check; advance succession and mounted combat; move the Khan or pin him to camp.
7. Audio; field state and area encounter sync; encounter pacing.
8. Field objectives, crossing, final stand, enemy behaviour (each enemy's steps in a fixed order); clan integrity check.
9. Spatial index rebuild; camp defences; Khan and rider fire; spawning.
10. Projectiles; gem collection; area combat; autosave; clan integrity check.
11. Character animation; HUD refresh; final boss spawn; present a queued story.

Every phase other than `playing` stops simulation and physics.

## Browser test hooks

In development builds `window.__gloam.scene` exposes the scene, and many browser tests read,
assign or call its members by name. `tests/e2e/scene-hooks.spec.ts` lists those names and their
kinds. When code moves into a system, keep each listed name working through a forwarder in the
scene's test-hook block at the end of the class. Declare forwarders that only tests use without
`private`, because `noUnusedLocals` rejects unused private members.
