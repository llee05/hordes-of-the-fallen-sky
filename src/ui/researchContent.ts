import { researchPreview } from '../game/state/progressionPreview';
import { synergyContent } from './synergyContent';
import { PATRONS } from '../game/data/patrons';
import { UPGRADES } from '../game/data/upgrades';
import { upgradeBlocker, upgradeCost, upgradeExcluded } from '../game/state/run';
import type { RunState } from '../game/types';
import { clanMark } from './artwork';
import { progressionMenu, type TreeBranch, type TreeViewState } from './progressionTree';

export function researchBranches(run: RunState): TreeBranch[] {
  return PATRONS.map((patron) => {
    const technologies = UPGRADES.filter((upgrade) => upgrade.patron === patron.id);
    const choiceRanks = new Map<string, number>();
    const total =
      technologies.reduce((sum, upgrade) => {
        if (!upgrade.exclusiveGroup) return sum + upgrade.maxStacks;
        choiceRanks.set(
          upgrade.exclusiveGroup,
          Math.max(choiceRanks.get(upgrade.exclusiveGroup) ?? 0, upgrade.maxStacks),
        );
        return sum;
      }, 0) + [...choiceRanks.values()].reduce((sum, count) => sum + count, 0);
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
              : (upgrade.requires ?? []).some((r) => (run.upgrades[r.id] ?? 0) < r.rank)
                ? 'locked'
                : run.pendingUpgrades < upgradeCost(upgrade)
                  ? 'unaffordable'
                  : 'available',
          ranks: { current: rank, max: upgrade.maxStacks },
          icon: upgrade.icon,
          choiceGroup: upgrade.exclusiveGroup,
          price: { knowledge: upgradeCost(upgrade) },
          preview: researchPreview(run, upgrade),
          prerequisites: (upgrade.requires ?? []).map((r) => ({
            id: r.id,
            title: UPGRADES.find((u) => u.id === r.id)?.title ?? r.id,
            rank: r.rank,
            current: run.upgrades[r.id] ?? 0,
          })),
          excludes: upgrade.exclusiveGroup
            ? UPGRADES.filter(
                (other) =>
                  other.id !== upgrade.id &&
                  upgradeExcluded(
                    { ...run, upgrades: { ...run.upgrades, [upgrade.id]: Math.max(1, rank) } },
                    other,
                  ) &&
                  !upgradeExcluded(run, other),
              ).map((other) => ({ id: other.id, title: other.title }))
            : [],
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
      'Each patron teaches its own traditions. One foundation rank opens its practices; two ranks and the practice a capstone names open that capstone. Take one capstone per patron and mix patrons freely. Foundations and practices cost one knowledge point, capstones two.',
    summary: [
      { label: 'Knowledge points', value: String(run.pendingUpgrades) },
      {
        label: 'Ranks learned',
        value: String(Object.values(run.upgrades).reduce((sum, rank) => sum + rank, 0)),
      },
      { label: 'Clan level', value: String(run.level) },
    ],
    branches: researchBranches(run),
    recipes: synergyContent(run),
    notice:
      'Unspent points keep. Stored Spirit pays for camp building. Each new expedition learns these traditions from the start.',
  });
}
