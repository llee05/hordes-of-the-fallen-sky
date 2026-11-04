# Extending camp development

Camp development is the only progression interface. The patron tech tree, knowledge points and Combinations catalogue are removed for now. Spirit shards still grant XP and levels; Spirit remains the separate camp construction currency.

The painted camp and its contextual parchment inspectors use `ui/nomadicCampModel.ts` and the shared helpers in `ui/progressionTree.ts`. The legacy camp inspector uses the same progression renderer. Author buildings, levels, requirements and effects as structured content in `game/data/nomadicCamp.ts`; keep costs and balance in `GAME.camp`. See [the nomadic camp guide](nomadic-camp.md) for ownership, worker reservation, level effects and save migration.

Inspectors use disposable purchase previews through `state/developmentPreview.ts` and `state/progressionPreview.ts`, displaying actual resource costs and changes to combat, food duration and gathering. Inspection never purchases, grants supplies or advances active time. Text distinguishes unavailable prerequisites, unaffordable purchases and completed levels. Search matches building names and effects without requiring accents.

Escape or controller Back closes a popover before leaving camp management. Purchases preserve focus and scroll. Popovers stay inside the viewport with a visible purchase action. Controls share scene-owned state; menus freeze simulation and character animation.

Run `npm run check`, affected browser specs and the Electron progression spec for changes to camp input or layout. Preserve coverage for atomic purchases, worker reservations, prerequisites, save migration, excess XP and succession.
