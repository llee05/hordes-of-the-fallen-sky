import { PATRONS } from '../game/data/patrons';
import { UPGRADES } from '../game/data/upgrades';
import { upgradeBlocker } from '../game/state/run';
import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import { progressionMenu, type TreeBranch, type TreeViewState } from './progressionTree';

export function researchBranches(run: RunState): TreeBranch[] {
  return PATRONS.map((patron) => {
    const technologies = UPGRADES.filter((upgrade) => upgrade.patron === patron.id);
    const total = technologies.reduce((sum, upgrade) => sum + upgrade.maxStacks, 0);
    const learned = technologies.reduce((sum, upgrade) => sum + (run.upgrades[upgrade.id] ?? 0), 0);
    return {
      id: patron.id,
      title: patron.name,
      category: patron.playstyle,
      description: patron.description,
      illustration: clanMark(patron.symbol),
      progress: `${learned} / ${total} ranks learned`,
      layout: 'tiers',
      nodes: technologies.map((upgrade) => {
        const rank = run.upgrades[upgrade.id] ?? 0;
        const next = rank + 1;
        const blocker = upgradeBlocker(run, upgrade, next);
        const mastered = rank >= upgrade.maxStacks;
        const isParent = technologies.some((other) =>
          other.requires?.some((requirement) => requirement.id === upgrade.id),
        );
        return {
          id: upgrade.id,
          title: upgrade.title,
          description: upgrade.description,
          status: mastered ? 'learned' : blocker ? 'locked' : 'available',
          cost: mastered ? 'Mastered' : '1 knowledge point',
          reason: mastered ? 'Learned' : (blocker ?? `Learn rank ${next}`),
          progress: `${rank} / ${upgrade.maxStacks} ranks learned`,
          kind: !upgrade.requires?.length ? 'foundation' : isParent ? 'practice' : 'capstone',
          requires: (upgrade.requires ?? [])
            .filter((requirement) => technologies.some((entry) => entry.id === requirement.id))
            .map((requirement) => requirement.id),
          requirementsLabel: upgrade.requires?.length
            ? `Requires: ${upgrade.requires.map((requirement) => `${UPGRADES.find((entry) => entry.id === requirement.id)?.title ?? requirement.id} rank ${requirement.rank}`).join(' + ')}`
            : '',
          action: { research: upgrade.id, rank: String(next) },
        };
      }),
    };
  });
}

export function researchMenu(run: RunState, view: TreeViewState): string {
  return progressionMenu({
    title: 'Patron tech tree',
    eyebrow: `${PATRONS.length} PATRONS · ONE LIVING CLAN`,
    mark: 'spirit',
    kind: 'patrons',
    allLabel: 'All patrons',
    view,
    introduction:
      'Shape your expedition through patron traditions. Learn two foundation ranks, then both practices to unlock a capstone. Mix patrons freely. Each rank costs one knowledge point earned from spirit shards.',
    summary: [
      { label: 'Knowledge points', value: String(run.pendingUpgrades) },
      {
        label: 'Ranks learned',
        value: String(Object.values(run.upgrades).reduce((sum, rank) => sum + rank, 0)),
      },
      { label: 'Clan level', value: String(run.level) },
    ],
    branches: researchBranches(run),
    notice:
      'Unspent points stay with the clan. Stored Spirit funds camp construction. These traditions begin afresh with each expedition.',
  });
}
