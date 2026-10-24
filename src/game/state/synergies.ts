import { BUILDINGS } from '../data/clan';
import { UPGRADES } from '../data/upgrades';
import type { SynergyDefinition } from '../data/synergies';
import type { BuildingId, RunState } from '../types';
import { buildingCost, developmentExcluded, hasDevelopment } from './clan';
import { upgradeCost, upgradeExcluded } from './run';

export function synergyProgress(run: RunState, recipe: SynergyDefinition) {
  const research = new Map<string, number>();
  const camp = new Map<string, { building: BuildingId; path?: string }>();
  const addResearch = (id: string, rank: number) => {
    if ((research.get(id) ?? 0) >= rank) return;
    research.set(id, rank);
    UPGRADES.find((u) => u.id === id)?.requires?.forEach((r) => addResearch(r.id, r.rank));
  };
  const addCamp = (building: BuildingId, path?: string) => {
    const key = `${building}-${path ?? 'base'}`;
    if (camp.has(key)) return;
    camp.set(key, { building, path });
    if (!path) return;
    addCamp(building);
    BUILDINGS.find((b) => b.id === building)
      ?.paths.find((p) => p.id === path)
      ?.requires?.forEach((p) => addCamp(building, p));
  };
  const requirements = recipe.requirements.map((r) => {
    if (r.kind === 'research') {
      const definition = UPGRADES.find((u) => u.id === r.id)!;
      addResearch(r.id, r.rank);
      return {
        ...r,
        title: definition.title,
        node: r.id,
        branch: definition.patron,
        current: run.upgrades[r.id] ?? 0,
        needed: r.rank,
        closed: upgradeExcluded(run, definition),
      };
    }
    const definition = BUILDINGS.find((b) => b.id === r.building)!;
    addCamp(r.building, r.path);
    return {
      ...r,
      title: definition.paths.find((p) => p.id === r.path)!.title,
      node: `${r.building}-${r.path}`,
      branch: r.building,
      current: hasDevelopment(run, r.building, r.path) ? 1 : 0,
      needed: 1,
      closed: developmentExcluded(run, r.building, r.path),
    };
  });
  let knowledge = 0,
    materials = 0,
    spirit = 0,
    workers = 0;
  for (const [id, rank] of research)
    knowledge +=
      Math.max(0, rank - (run.upgrades[id] ?? 0)) * upgradeCost(UPGRADES.find((u) => u.id === id)!);
  for (const { building, path } of camp.values()) {
    if (path ? hasDevelopment(run, building, path) : run.clan.buildings[building] > 0) continue;
    const cost = buildingCost(run, building, path);
    materials += cost.materials;
    spirit += cost.spirit;
    if (!path) workers += BUILDINGS.find((b) => b.id === building)!.workers;
  }
  const complete = requirements.every((r) => r.current >= r.needed);
  const closed = requirements.some((r) => r.closed);
  return { requirements, complete, closed, price: { knowledge, materials, spirit, workers } };
}
