# Extending the progression interfaces

The patron tree and camp building inspector use the shared [progression renderer](../src/ui/progressionTree.ts). Each patron opens as one connected prerequisite graph, with compact nodes and a persistent inspector. The overview compares all patron traditions. Camp management uses one painted scene with contextual parchment popups. See [the nomadic camp guide](nomadic-camp.md) for its ownership, level, effect and save model.

Select a node to inspect; use the inspector’s **Learn** button to purchase. Both panels show real before/after stats from [progressionPreview](../src/game/state/progressionPreview.ts), after applying the actual purchase to a disposable run. Current patron/camp multipliers and conditional combat bonuses are included and labeled. Descriptions remain visible when a prerequisite prevents a preview. Separate text and styling identify missing prerequisites, insufficient resources, learned/mastered ranks, and excluded paths. Ancestor highlighting and route totals show the remaining prerequisite purchases, deduplicating shared parents and accounting for required foundation ranks.

The **Combinations** catalogue describes existing interactions such as Burning Tempest. [data/synergies.ts](../src/game/data/synergies.ts) authors their requirements; [state/synergies.ts](../src/game/state/synergies.ts) computes completion, exclusion, and remaining costs, including establishments, prerequisite ranks, worker reservations, and current construction discounts. No extra purchase or hidden stat bonus is granted. Requirement links open the relevant patron/building and node while simulation stays paused. Escape returns to the source panel, then its original paused or active parent. Camp purchases remain blocked during migration.

[GameUI](../src/ui/GameUI.ts) owns presentation selection, search, focus and scroll. [ArenaScene](../src/game/scenes/ArenaScene.ts) owns planning transitions and validates actions through renderer-independent state functions. The interface never keeps a second copy of progression or economy state.

## Adding patron technologies

[data/patrons.ts](../src/game/data/patrons.ts) defines each patron's stable ID, name, playstyle, symbol, and description. [data/upgrades.ts](../src/game/data/upgrades.ts) groups technologies under those IDs. The export derives `patron`, `subtitle`, `category`, and `icon` from the catalog. Add a technology to an existing patron's `technologies` list:

```ts
{
  id: 'a-stable-new-id',
  title: 'A new practice',
  kind: 'practice',
  maxStacks: 1,
  description: 'Describe the effect of each rank.',
  requires: [{ id: 'power', rank: 2 }],
  apply: (run) => { run.stats.damage *= GAME.patrons.example.damage; },
}
```

Define the example balance value in [config.ts](../src/game/config.ts) before using it. A technology exported elsewhere as a complete `UpgradeDefinition` must also supply `patron`, `subtitle`, `category`, and `icon`; adding it to the grouped catalog supplies those automatically.

Each technology is one compact node with accessible rank counts and visible rank pips; purchasing a repeatable foundation updates the same card. Prerequisite depth determines the visual tiers, so extra siblings, combinations, and deeper technologies appear without new UI markup or coordinates. Authored `kind` identifies foundations, practices, and capstones; it does not restrict graph depth. `knowledgeCost` and local `exclusiveGroup` define capstone purchases. Alternative patron specializations live in [specializations.ts](../src/game/data/specializations.ts).

Every listed requirement must be met. Keep IDs stable and graphs reachable: avoid cycles, missing technologies, or prerequisite ranks above the required technology's maximum. Local prerequisites create layout connections; cross-patron requirements remain enforced by the state layer and appear by name/rank in the requirements text. No lines cross unrelated branch panels.

To add a patron, extend `PatronId` in [types.ts](../src/game/types.ts), add catalog metadata and a technology group. The branch count, progress totals, overview, and search derive from that data. Choose an existing symbol or extend the original vector marks in [artwork.ts](../src/ui/artwork.ts); an unknown symbol falls back to the spirit mark. There are no fixed eight-slot layouts or number-key assignments.

Each level grants one banked knowledge point (`run.pendingUpgrades`). Foundations and practices cost one point; capstones declare `knowledgeCost: 2`. `exclusiveGroup` applies within each patron, and excluded prerequisites exclude descendants. Practices unlock at foundation rank one; each capstone requires a focused practice plus foundation rank two. [state/run.ts](../src/game/state/run.ts) checks expected next rank, prerequisites, points, and stack limits before applying effects once. The scene permits research actions only in the open research phase. The scene sends an explicit technology ID and expected rank, so replaying an old action cannot buy a second rank. Leaving the tree retains unspent points. Only complete mastery of all reachable choices converts later points to food/material rewards; a temporarily blocked technology does not count as mastered.

New gameplay mechanics belong in the typed `PatronEffects` contract with neutral defaults in [state/patrons.ts](../src/game/state/patrons.ts), balance in `GAME.patrons`, and active-time simulation in the existing state/scene systems. Keep the DOM an action/snapshot interface. [PatronSupport](../src/game/systems/PatronSupport.ts) owns a bounded three-echo pool and ground fields; it freezes outside `playing` and relocates on camp arrival. Its renderer-independent [PatronSupportClock](../src/game/state/patronSupportClock.ts) owns support timers and release decisions. Extend these systems for genuinely new effects, rather than adding mutable simulation state to tree cards.

## Adding camp buildings and levels

Use the registry, typed effects, ownership validation and purchase APIs described in [the nomadic camp guide](nomadic-camp.md#state-rendering-and-simulation). `data/clan.ts` and `data/campEstate.ts` retain the retired craft/tier definitions for migration; they do not author current camp choices. Their historical content is documented in [the legacy camp catalog](camp-upgrade-tree.md).

## Shared view contract

For patron graphs, a `TreeBranch` supplies stable identity, category, description, illustration, progress, and nodes. `treeLevels` derives layers from local `requires` IDs; `graphLayout` places any number of siblings, multiple-parent nodes, and deeper tiers. Duplicate IDs, cycles, and missing parents fail validation. SVG paths connect the actual prerequisites; transitive edges are omitted for clarity while the inspector still lists every required rank.

A `TreeNode` supplies identity, description, blocking reason, state (`available`, `unaffordable`, `learned`, `locked`, `excluded`), local parent IDs and action attributes. Structured `ranks`, `price`, and `prerequisites` support exact route totals. `preview` contains formatted before/after stat changes. `choiceGroup` and `excludes` support side-by-side alternatives and the closed-descendant list. `kind` and `icon` distinguish roles and capstone medallions. Purchase attributes appear only on the explicit inspector action; focusable graph nodes carry inspection intents.

The navigation uses indigo felt, manuscript surfaces, brass connections, turquoise learned states and rust excluded states. Each state also has text, so colour is supplementary. Search matches patron/building names, node names, and effect descriptions without requiring accents. Empty search results remove purchase controls. Selecting a painted building clears the search and opens its parchment; **All building levels** lists the authored progression.

Arrow Up/Down follows graph parent/child edges; Left/Right moves between siblings. Tab reaches navigation, inspectable prerequisites, comparisons and the explicit purchase button. Enter/Space inspect nodes and activate focused actions; controller next/previous and confirm use the same native controls. Holding confirm cannot repeatedly buy ranks. Purchases preserve graph/details scroll and return focus to the selected node when the purchase becomes disabled. Search input does not trigger gameplay shortcuts. The workspace stacks on narrow windows, with horizontal graph scrolling contained inside its viewport. Camp resources remain in the scene header. Parchments are clamped into the viewport and keep their purchase action sticky while reading details.

Camp artwork and the simulation stay frozen in planning. Extra patron technology definitions require no UI slots or hard-coded graph coordinates; camp placement follows the registry and persistent optional locations described in [the camp guide](nomadic-camp.md).

## Verification

Run `npm run check`, the browser regression suite, and the Electron smoke test for progression/input changes. Unit tests cover the eight-patron roster, all specialization routes and authored ranks, every practice/capstone gate, distinct patron effects, multi-level XP, point spending, prerequisite checks, duplicate purchases, mastery conversion, growing branch/category counts, camp building purchases, and arbitrary patron-tree depth. Browser tests cover patron mixing, purchased summons, piercing/pool reuse, terrain pulses, camp wards, one-use revival, actual shard pickup without interruption, the camp model and patron tree, camp site selection with keyboard/controller, live reduced motion, unspent points, paused parent menus, story continuity, and desktop/Steam Deck/narrow layouts. Use the existing screenshot paths in `test-results/` to inspect the result.
