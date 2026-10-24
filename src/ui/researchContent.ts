import { PATRONS } from '../game/data/patrons';
import { UPGRADES } from '../game/data/upgrades';
import { upgradeBlocker, upgradeCost, upgradeExcluded } from '../game/state/run';
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
          status: mastered
            ? 'learned'
            : upgradeExcluded(run, upgrade)
              ? 'excluded'
              : blocker
                ? 'locked'
                : 'available',
          cost: mastered
            ? 'Mastered'
            : `${upgradeCost(upgrade)} knowledge point${upgradeCost(upgrade) === 1 ? '' : 's'}`,
          reason: mastered ? 'Learned' : (blocker ?? `Learn rank ${next}`),
          progress: `${rank} / ${upgrade.maxStacks} ranks learned`,
          kind:
            upgrade.kind ??
            (!upgrade.requires?.length ? 'foundation' : isParent ? 'practice' : 'capstone'),
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
      'Shape your expedition through patron traditions. Practices unlock after one foundation rank. Two foundation ranks and a focused practice unlock a capstone. Choose one capstone per patron; mix patrons freely. Foundations and practices cost one knowledge point; capstones cost two.',
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
