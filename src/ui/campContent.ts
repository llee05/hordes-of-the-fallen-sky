import { BUILDINGS } from '../game/data/clan';
import {
  assignedWorkers,
  buildingBlocker,
  buildingCost,
  burningTempest,
  developmentExcluded,
  hasDevelopment,
} from '../game/state/clan';
import type { RunState } from '../game/types';
import { campIllustration } from './artwork';
import {
  progressionMenu,
  type TreeBranch,
  type TreeNode,
  type TreeViewState,
} from './progressionTree';

/** Authored parent IDs determine the layout, including deeper tiers. */
export function campBranches(run: RunState): TreeBranch[] {
  return BUILDINGS.map((building) => {
    const established = run.clan.buildings[building.id] > 0;
    const learned = run.clan.paths[building.id] ?? [];
    const baseId = `${building.id}-base`;
    const baseBlocker = buildingBlocker(run, building.id);
    const costLabel = (path?: string): string => {
      const cost = buildingCost(run, building.id, path);
      return `${cost.materials} materials${cost.spirit ? ` · ${cost.spirit} Spirit` : ''}${path === undefined ? ` · ${building.workers} workers` : ''}`;
    };
    const nodes: TreeNode[] = [
      {
        id: baseId,
        title: `Establish ${building.title}`,
        description:
          established && building.startsBuilt
            ? 'This building is provided at the start of your expedition.'
            : building.description,
        status: established ? 'learned' : baseBlocker ? 'locked' : 'available',
        cost: building.startsBuilt ? 'Provided at the start' : costLabel(),
        reason: established ? 'Established' : (baseBlocker ?? ''),
        requires: [],
        action: { building: building.id },
      },
      ...building.paths.map((path): TreeNode => {
        const chosen = hasDevelopment(run, building.id, path.id);
        const excluded = developmentExcluded(run, building.id, path.id);
        const blocker = buildingBlocker(run, building.id, path.id);
        const requirements = path.requires?.length
          ? path.requires.map((id) => `${building.id}-${id}`)
          : [baseId];
        return {
          id: `${building.id}-${path.id}`,
          title: path.title,
          description: path.description,
          status: chosen ? 'learned' : excluded ? 'excluded' : blocker ? 'locked' : 'available',
          cost: costLabel(path.id),
          reason: chosen
            ? 'Learned'
            : excluded
              ? 'Another path chosen'
              : (blocker ?? (path.exclusiveGroup ? 'Choose one of these paths' : '')),
          requires: requirements,
          action: { building: building.id, path: path.id },
        };
      }),
    ];
    return {
      id: building.id,
      title: building.title,
      category: building.category,
      description: building.description,
      illustration: campIllustration(building.illustration ?? 'ger'),
      progress: established
        ? `${learned.length} development${learned.length === 1 ? '' : 's'} learned`
        : `${building.workers} workers to establish`,
      layout: 'tiers',
      nodes,
    };
  });
}

export function buildingMenu(run: RunState, view: TreeViewState): string {
  return progressionMenu({
    title: 'Build a people.',
    eyebrow: 'CAMP UPGRADE TREE',
    mark: 'ger',
    view,
    introduction:
      'Establish a building, then follow its connected crafts and developments. Shared crafts can be learned together. An exclusive specialization locks its alternative and that path’s descendants. Your entire camp travels with you.',
    summary: [
      { label: 'Materials', value: String(Math.floor(run.clan.materials)) },
      { label: 'Spirit', value: String(Math.floor(run.clan.spirit)) },
      { label: 'Workers assigned', value: `${assignedWorkers(run)} / ${run.clan.population}` },
      {
        label: 'Developments learned',
        value: String(Object.values(run.clan.paths).reduce((sum, paths) => sum + paths.length, 0)),
      },
    ],
    branches: campBranches(run),
    notice: burningTempest(run)
      ? 'Burning Tempest learned — Fire arrows and Wind shamans combine in every volley.'
      : 'Fire arrows + Wind shamans unlock the Burning Tempest. Buildings and learned developments carry into the next pasture.',
  });
}
