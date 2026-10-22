# Extending the progression interfaces

The tradition tech tree uses the shared [progression renderer](../src/ui/progressionTree.ts). Content adapters provide branches and nodes; the renderer handles layout, states, categories, search, and accessible controls. [GameUI](../src/ui/GameUI.ts) owns only presentation state such as the current filter and search. [ArenaScene](../src/game/scenes/ArenaScene.ts) owns menu transitions and actions, while renderer-independent state functions validate purchases.

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

## Shared view contract

A `TreeBranch` supplies a stable ID, title, category, description, illustration, progress label, node collection, and layout:

- `ranks` renders a compact connected rank track. The content adapter provides ranks in order.
- `tiers` computes levels from node `requires` IDs. Nodes can appear in any input order, with multiple parents, additional sibling branches, and deeper tiers. All listed parents must belong to that branch. Missing parents, cycles, and duplicate IDs fail validation.

A `TreeNode` supplies a stable ID, title, effect description, display cost, blocking reason, state (`available`, `learned`, `locked`, or `excluded`), local parent IDs, and action attributes. Action attributes route an intent to the scene; the game state remains the authority for whether it succeeds. A disabled appearance alone is never purchase validation.

The layout uses wrapping grids and scrolls inside the panel. Additional categories derive from the branch collection. Search matches branch names, node names, and effect descriptions. Learned and locked nodes remain focusable for inspection, with their state and reason in accessible labels. Available nodes have distinct styling. Keyboard arrows, Tab, Enter, Space, mouse, touch, and controller navigation use native controls. Search input does not activate gameplay keybindings. Purchases and filtering preserve focus and panel scroll.

## Verification

Run `npm run check`, the browser regression suite, and the Electron smoke test for progression/input changes. Unit tests cover multi-level XP, point spending, prerequisite checks, duplicate purchases, mastery conversion, growing branch/category counts, and arbitrary tree depth. Browser tests cover actual shard pickup without interruption, tree navigation, unspent points, paused parent menus, story continuity, and desktop/Steam Deck/narrow layouts. Use the existing screenshot paths in `test-results/` to inspect the result.
