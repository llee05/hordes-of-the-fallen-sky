import { UPGRADES } from '../game/data/upgrades';
import { upgradeBlocker } from '../game/state/run';
import type { RunState } from '../game/types';
import { clanMark, TRADITION_MARKS } from './artwork';
import { progressionMenu, type TreeBranch, type TreeViewState } from './progressionTree';

export function researchBranches(run: RunState): TreeBranch[] {
  return UPGRADES.map((upgrade) => {
    const learned = run.upgrades[upgrade.id] ?? 0;
    return {
      id: upgrade.id,
      title: upgrade.title,
      category: upgrade.category,
      description: upgrade.description,
      illustration: clanMark(TRADITION_MARKS[upgrade.id] ?? 'spirit'),
      progress: `${learned} / ${upgrade.maxStacks} ranks learned`,
      layout: 'ranks',
      nodes: Array.from({ length: upgrade.maxStacks }, (_, index) => {
        const rank = index + 1;
        const blocker = upgradeBlocker(run, upgrade, rank);
        return {
          id: `${upgrade.id}-${rank}`,
          title: `Rank ${rank}`,
          description: upgrade.title,
          status: rank <= learned ? 'learned' : blocker ? 'locked' : 'available',
          cost: '1 knowledge point',
          reason: rank <= learned ? 'Learned' : (blocker ?? ''),
          requires: rank > 1 ? [`${upgrade.id}-${rank - 1}`] : [],
          action: { research: upgrade.id, rank: String(rank) },
        };
      }),
    };
  });
}

export function researchMenu(run: RunState, view: TreeViewState): string {
  return progressionMenu({
    title: 'Tradition tech tree',
    eyebrow: 'WHAT WE CARRY',
    mark: 'spirit',
    view,
    introduction:
      'Collect spirit shards to earn one knowledge point per level. Choose a highlighted rank to learn it. Points stay with you until spent; you can return to the road at any time.',
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
      'Each rank costs 1 knowledge point and needs the previous rank in its branch. Stored Spirit is reserved for camp construction.',
  });
}
