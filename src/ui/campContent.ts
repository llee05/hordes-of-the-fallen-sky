import { campStatPreview } from '../game/state/progressionPreview';
import { BUILDINGS } from '../game/data/clan';
import {
  buildingBlocker,
  buildingCost,
  developmentExcluded,
  hasDevelopment,
} from '../game/state/clan';
import type { RunState } from '../game/types';
import { campIllustration } from './artwork';
import { type TreeBranch, type TreeNode } from './progressionTree';

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
        status: established
          ? 'learned'
          : baseBlocker === 'Gather more resources' || baseBlocker === 'More families needed'
            ? 'unaffordable'
            : baseBlocker
              ? 'locked'
              : 'available',
        ranks: { current: established ? 1 : 0, max: 1 },
        icon:
          building.illustration === 'archery'
            ? 'bow'
            : building.illustration === 'herd'
              ? 'horse'
              : (building.illustration ?? 'ger'),
        price: { ...buildingCost(run, building.id), workers: building.workers },
        preview: campStatPreview(run, building.id),
        kind: 'foundation',
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
          status: chosen
            ? 'learned'
            : excluded
              ? 'excluded'
              : blocker === 'Gather more resources'
                ? 'unaffordable'
                : blocker
                  ? 'locked'
                  : 'available',
          ranks: { current: chosen ? 1 : 0, max: 1 },
          price: buildingCost(run, building.id, path.id),
          preview: campStatPreview(run, building.id, path.id),
          choiceGroup: path.exclusiveGroup,
          icon: path.exclusiveGroup
            ? 'banner'
            : building.illustration === 'archery'
              ? 'bow'
              : building.illustration === 'herd'
                ? 'horse'
                : (building.illustration ?? 'ger'),
          kind: building.paths.some((p) => p.requires?.includes(path.id))
            ? 'practice'
            : path.requires?.length
              ? 'capstone'
              : 'practice',
          prerequisites: requirements.map((id) => ({
            id,
            title:
              id === baseId
                ? building.title
                : (building.paths.find((p) => `${building.id}-${p.id}` === id)?.title ?? id),
            rank: 1,
            current:
              id === baseId
                ? established
                  ? 1
                  : 0
                : hasDevelopment(run, building.id, id.slice(building.id.length + 1))
                  ? 1
                  : 0,
          })),
          excludes: path.exclusiveGroup
            ? building.paths
                .filter(
                  (other) =>
                    other.id !== path.id &&
                    developmentExcluded(
                      {
                        ...run,
                        clan: {
                          ...run.clan,
                          paths: { ...run.clan.paths, [building.id]: [...learned, path.id] },
                        },
                      },
                      building.id,
                      other.id,
                    ) &&
                    !developmentExcluded(run, building.id, other.id),
                )
                .map((other) => ({ id: `${building.id}-${other.id}`, title: other.title }))
            : [],
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
