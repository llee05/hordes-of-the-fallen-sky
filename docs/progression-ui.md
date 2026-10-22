# Extending the progression interfaces

The tradition and camp upgrade trees use the shared [progression renderer](../src/ui/progressionTree.ts). Content adapters provide branches and nodes; the renderer handles layout, states, categories, search, and accessible controls. [GameUI](../src/ui/GameUI.ts) owns only presentation state such as the current filter and search. [ArenaScene](../src/game/scenes/ArenaScene.ts) owns menu transitions and actions, while renderer-independent state functions validate purchases.

## Adding a tradition

Add an `UpgradeDefinition` to [data/upgrades.ts](../src/game/data/upgrades.ts):

```ts
{
  id: 'a-stable-new-id',
  title: 'A new tradition',
  subtitle: 'ITS EFFECT',
  category: 'Warfare',
  icon: '◇',
  maxStacks: 3,
  description: 'Describe the effect of each rank.',
  requires: [{ id: 'power', rank: 2 }], // Optional; all listed requirements must be met.
  apply: (run) => { run.stats.damage *= 1.1; },
}
```

The branch and all three rank nodes appear automatically. Changing `maxStacks` changes the displayed rank chain; changing or adding a category updates the filter buttons. There are no three-card limits, fixed branch counts, authored coordinates, or shortcut-number assignments. Use stable IDs for prerequisites. Keep prerequisite graphs reachable: avoid cycles, missing IDs, or ranks above the required tradition's maximum. Optional painted brass symbols can be registered in `TRADITION_MARKS` in [artwork.ts](../src/ui/artwork.ts); unregistered traditions use the existing spirit symbol.

Each level grants one banked knowledge point (`run.pendingUpgrades`). Every rank costs one point. [state/run.ts](../src/game/state/run.ts) checks rank order, prerequisites, remaining points, and stack limits. The scene accepts an explicit tradition ID and expected rank, so replaying an old action cannot purchase a second rank. The full tree stays open after a purchase; leaving it keeps unspent points. After complete mastery, points convert to the existing food/material rewards. Locked branches do not trigger this conversion.

## Adding camp developments and buildings

[data/clan.ts](../src/game/data/clan.ts) defines buildings and their development nodes. [campContent.ts](../src/ui/campContent.ts) derives the tree from that catalog. Every building is a branch, with an establishment node followed by its authored developments. Add any number of developments to a building's `paths` list:

```ts
{
  id: 'seasoned-bowyers',
  title: 'Seasoned bowyers',
  description: 'Composite bows gain another 10% force.',
  requires: ['fire-arrows'],
  materials: 45,
  spirit: 4,
  apply: (run) => { run.stats.damage *= 1.1; },
}
```

This creates a deeper tier below Fire arrows. A development with no `requires` attaches directly below establishment. Parent IDs refer to developments in the same building, and every listed parent must be learned. The shared layout computes tier positions and displays the names of required nodes. Give every development a unique, stable ID; `base` is reserved for the establishment node. Rearranging definitions does not alter learned effects or selections.

Use `exclusiveGroup: 'specialization'` for mutually exclusive alternatives. All current buildings' first choices use that group. A third alternative can join the same group, while a deeper upgrade can omit it or join a different group. Exclusivity applies to each named group within a building, not across the entire camp. A prerequisite can naturally restrict a deeper upgrade to the chosen path.

The optional `materials` and `spirit` fields override the default development cost of 1.5× the base building cost, rounded up. The `apply` callback grants immediate benefits; `onBuild` grants establishment benefits. Passive or combat effects use `hasDevelopment(run, buildingId, developmentId)` in the simulation. Existing effects and prices are preserved. [state/clan.ts](../src/game/state/clan.ts) validates the phase, migration state, prerequisite IDs, exclusive groups, resources, and duplicate actions before charging once. Workers are reserved on establishment, with no extra workers for developments.

`clan.paths[buildingId]` stores acquired development IDs as an array. `clan.buildings[buildingId]` is zero before establishment and increases with each successful establishment/development. Use `hasDevelopment` for specific effects, rather than positional path indices or a fixed building level. Active expeditions are not persisted, so this does not require migrating profile saves.

To add a building, extend `BuildingId` in [types.ts](../src/game/types.ts) and add its definition, category, costs, workers, identity doctrine, development list, and effects. Starting levels derive from `startsBuilt`; no manual starting-state slots are needed. Choose an existing `illustration`, or omit it for the ger fallback. Camp UI artwork is independent of the building ID. Add world artwork and simulation behavior as needed for the new building; the menu requires no new HTML, CSS columns, or coordinate tables. New categories automatically appear in its filters.

## Shared view contract

A `TreeBranch` supplies a stable ID, title, category, description, illustration, progress label, node collection, and layout:

- `ranks` renders a compact connected rank track. The content adapter provides ranks in order.
- `tiers` computes levels from node `requires` IDs. Nodes can appear in any input order, with multiple parents, additional sibling branches, and deeper tiers. All listed parents must belong to that branch. Missing parents, cycles, and duplicate IDs fail validation.

A `TreeNode` supplies a stable ID, title, effect description, display cost, blocking reason, state (`available`, `learned`, `locked`, or `excluded`), local parent IDs, and action attributes. Action attributes route an intent to the scene; the game state remains the authority for whether it succeeds. A disabled appearance alone is never purchase validation.

The layout uses wrapping grids and scrolls inside the panel. Additional categories derive from the branch collection. Search matches branch names, node names, and effect descriptions. Learned and locked nodes remain focusable for inspection, with their state and reason in accessible labels. Available nodes have distinct styling. Keyboard arrows, Tab, Enter, Space, mouse, touch, and controller navigation use native controls. Search input does not activate gameplay keybindings. Purchases and filtering preserve focus and panel scroll.

## Verification

Run `npm run check`, the browser regression suite, and the Electron smoke test for progression/input changes. Unit tests cover multi-level XP, point spending, prerequisite checks, duplicate purchases, mastery conversion, growing branch/category counts, additional camp alternatives, and arbitrary tree depth. Browser tests cover actual shard pickup without interruption, both trees, an injected third camp path and deeper tier, unspent points, paused parent menus, story continuity, and desktop/Steam Deck/narrow layouts. Use the existing screenshot paths in `test-results/` to inspect the result.
