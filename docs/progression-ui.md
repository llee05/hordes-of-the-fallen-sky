# Extending the progression interfaces

The patron tree and camp development inspector use the shared [progression renderer](../src/ui/progressionTree.ts). Content adapters provide branches and nodes; the renderer handles tiers, states, requirements, and accessible purchase controls. The patron view adds categories and search. The camp opens as a selectable painted miniature with one building’s developments in a side inspector. [GameUI](../src/ui/GameUI.ts) owns only presentation state such as the current filter, search, and selected camp site. [ArenaScene](../src/game/scenes/ArenaScene.ts) owns menu transitions and actions, while renderer-independent state functions validate purchases.

## Adding patron technologies

[data/patrons.ts](../src/game/data/patrons.ts) defines each patron's stable ID, name, playstyle, symbol, and description. [data/upgrades.ts](../src/game/data/upgrades.ts) groups technologies under those IDs. The export derives `patron`, `subtitle`, `category`, and `icon` from the catalog. Add a technology to an existing patron's `technologies` list:

```ts
{
  id: 'a-stable-new-id',
  title: 'A new practice',
  maxStacks: 1,
  description: 'Describe the effect of each rank.',
  requires: [{ id: 'power', rank: 2 }],
  apply: (run) => { run.stats.damage *= GAME.patrons.example.damage; },
}
```

Define the example balance value in [config.ts](../src/game/config.ts) before using it. A technology exported elsewhere as a complete `UpgradeDefinition` must also supply `patron`, `subtitle`, `category`, and `icon`; adding it to the grouped catalog supplies those automatically.

Each technology is one card showing `learned ranks / maxStacks`; purchasing a repeatable foundation updates the same card. Prerequisite depth determines the visual tiers, so extra siblings, combinations, and deeper technologies appear without new UI markup or coordinates. An entry with no prerequisites is labeled a foundation; an entry required by another local technology is a practice; a terminal entry is a capstone. These are presentation labels, not restrictions on rank counts or graph depth.

Every listed requirement must be met. Keep IDs stable and graphs reachable: avoid cycles, missing technologies, or prerequisite ranks above the required technology's maximum. Local prerequisites create layout connections; cross-patron requirements remain enforced by the state layer and appear by name/rank in the requirements text. No lines cross unrelated branch panels.

To add a patron, extend `PatronId` in [types.ts](../src/game/types.ts), add catalog metadata and a technology group. The branch count, progress totals, playstyle filters, and search derive from that data. Choose an existing symbol or extend the original vector marks in [artwork.ts](../src/ui/artwork.ts); an unknown symbol falls back to the spirit mark. There are no fixed eight-slot layouts or number-key assignments.

Each level grants one banked knowledge point (`run.pendingUpgrades`). Every rank costs one point. [state/run.ts](../src/game/state/run.ts) checks expected next rank, prerequisites, points, and stack limits before applying effects once. The scene permits research actions only in the open research phase. The scene sends an explicit technology ID and expected rank, so replaying an old action cannot buy a second rank. Leaving the tree retains unspent points. Only complete mastery converts later points to food/material rewards; a temporarily blocked technology does not count as mastered.

New gameplay mechanics belong in the typed `PatronEffects` contract with neutral defaults in [state/patrons.ts](../src/game/state/patrons.ts), balance in `GAME.patrons`, and active-time simulation in the existing state/scene systems. Keep the DOM an action/snapshot interface. [PatronSupport](../src/game/systems/PatronSupport.ts) owns a bounded three-echo pool, ground fields, and active-time support timers; it freezes outside `playing` and relocates on camp arrival. Extend these systems for genuinely new effects, rather than adding mutable simulation state to tree cards.

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

Use `exclusiveGroup: 'specialization'` for mutually exclusive alternatives. The five original buildings retain their exclusive pairs; their shared crafts omit this field. The felt, provisions, and relay branches have complementary crafts and two-parent final upgrades. A third alternative can join an existing group, while a deeper upgrade can omit it or join another group. Exclusivity applies to each named group within a building, not across the entire camp. A prerequisite naturally restricts a deeper upgrade to the chosen path; excluded ancestors also exclude their descendants.

The optional `materials` and `spirit` fields override the default development cost of 1.5× the base building cost, rounded up. The `apply` callback grants immediate benefits; `onBuild` grants establishment benefits. Passive or combat effects use `hasDevelopment(run, buildingId, developmentId)` in the simulation. Prices pass through `buildingCost(run, id, path)`, which applies Guardian material discounts once and rounds up; Spirit and workers are unchanged. Use that same function for UI previews and purchase validation. [state/clan.ts](../src/game/state/clan.ts) validates the phase, migration state, prerequisite IDs, exclusive groups, resources, and duplicate actions before charging once. Workers are reserved on establishment, with no extra workers for developments.

Both buildings and development nodes can supply typed `effects: { multipliers: { ... }, bonuses: { ... } }`. [state/camp.ts](../src/game/state/camp.ts) supplies neutral defaults and applies these effects once after a successful purchase; `clan.campEffects` carries the result across crossings. Multipliers combine multiplicatively, while bonuses add. Economy, transport, recovery, targeting, attacks, and arrival rewards consume this state through the existing simulation. Keep new balance values in `GAME.camp`. Use callbacks for immediate grants and effects for ongoing benefits. Descendants of an excluded specialization also display as excluded, at any depth.

For example, the actual supply-cache development uses `effects: { bonuses: { arrivalMaterials: GAME.camp.relay.caches.arrivalMaterials, arrivalFood: GAME.camp.relay.caches.arrivalFood } }`. It registers the recurring benefit at purchase; `advanceClan` pays it only after a completed crossing. Do not grant arrival resources in UI callbacks, on opening menus, or on departure. The complete current catalog and cultural sources are in [the camp upgrade tree](camp-upgrade-tree.md).

`clan.paths[buildingId]` stores acquired development IDs as an array. `clan.buildings[buildingId]` is zero before establishment and increases with each successful establishment/development. Use `hasDevelopment` for specific effects, rather than positional path indices or a fixed building level. Active expeditions are not persisted, so this does not require migrating profile saves.

To add a building, extend `BuildingId` in [types.ts](../src/game/types.ts) and add its definition, category, costs, workers, identity doctrine, development list, and effects. Starting levels derive from `startsBuilt`; no manual starting-state slots are needed. Choose an existing `illustration`, or omit it for the ger fallback. Camp inspector artwork is independent of the building ID. [campModel.ts](../src/ui/campModel.ts) assembles the landscape from bundled props and resting resident poses via [artwork.ts](../src/ui/artwork.ts). Presentation coordinates and optional building-specific assemblies belong there; an added building gets a fallback ger and grid placement until its miniature is authored. Developments of any depth require no new inspector markup. Add world artwork and simulation behavior as needed for a new building.

## Shared view contract

A `TreeBranch` supplies a stable ID, title, category, description, illustration, progress label, node collection, and layout:

- `ranks` renders a compact connected rank track. The content adapter provides ranks in order.
- `tiers` computes levels from node `requires` IDs. Nodes can appear in any input order, with multiple parents, additional sibling branches, and deeper tiers. All listed parents must belong to that branch. Missing parents, cycles, and duplicate IDs fail validation.

A `TreeNode` supplies a stable ID, title, effect description, display cost, blocking reason, state (`available`, `learned`, `locked`, or `excluded`), local parent IDs, and action attributes. Optional `kind`, `progress`, and `requirementsLabel` add role labels, repeated-rank progress, and explicit prerequisite text without changing the shared layout. Action attributes route an intent to the scene; the game state remains the authority for whether it succeeds. A disabled appearance alone is never purchase validation.

The layout uses wrapping grids and scrolls inside the panel. Additional categories derive from the branch collection. Search matches branch names, node names, and effect descriptions with accent-insensitive comparison. Learned and locked nodes remain focusable for inspection, with their state and reason in accessible labels. Available nodes have distinct styling. Keyboard arrows, Tab, Enter, Space, mouse, touch, and controller navigation use native controls. Search input does not activate gameplay keybindings. Purchases and filtering preserve focus and panel scroll. Selecting a camp site keeps focus on that native button and resets the inspector scroll. Camp search matches names and effects, highlights matching sites, and shows a matching inspector; selecting any site clears the search. The full landscape stays visible, and a search with no matches removes purchase controls until the search is cleared or another site is selected. The camp stacks the inspector beneath the landscape on narrow windows. Its smoke, fire, flags, and grass use presentation-only CSS motion in [motion.css](../src/motion.css), covered by the shared live reduced-motion policy. Resident poses stay frozen with the world; this view does not advance character clocks or simulate another economy.

## Verification

Run `npm run check`, the browser regression suite, and the Electron smoke test for progression/input changes. Unit tests cover the eight-patron roster, all 40 ranks, every practice/capstone gate, distinct patron effects, multi-level XP, point spending, prerequisite checks, duplicate purchases, mastery conversion, growing branch/category counts, additional camp alternatives, and arbitrary tree depth. Browser tests cover patron mixing, purchased summons, piercing/pool reuse, terrain pulses, camp wards, one-use revival, actual shard pickup without interruption, the camp model and patron tree, camp site selection with keyboard/controller, live reduced motion, an injected third camp path and deeper tier, unspent points, paused parent menus, story continuity, and desktop/Steam Deck/narrow layouts. Use the existing screenshot paths in `test-results/` to inspect the result.
