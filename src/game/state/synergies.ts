import { BUILDINGS } from '../data/clan';
import { ENCAMPMENT_TIERS } from '../data/campEstate';
import { UPGRADES } from '../data/upgrades';
import type { SynergyDefinition } from '../data/synergies';
import type { BuildingId, RunState } from '../types';
import { buildingCost, developmentExcluded, hasDevelopment } from './clan';
import { upgradeCost, upgradeExcluded } from './run';
import { encampment, estateCost } from './campEstate';

export function synergyProgress(run: RunState, recipe: SynergyDefinition) {
  const research = new Map<string, number>();
  const camp = new Map<string, { building: BuildingId; path?: string }>();
  const tiers = new Set<number>();
  const addResearch = (id: string, rank: number) => {
    if ((research.get(id) ?? 0) >= rank) return;
    research.set(id, rank);
    UPGRADES.find((u) => u.id === id)?.requires?.forEach((r) => addResearch(r.id, r.rank));
  };
  function addTier(tier: number) {
    for (let next = encampment(run).tier + 1; next <= tier; next++) {
      if (tiers.has(next)) continue;
      tiers.add(next);
      ENCAMPMENT_TIERS[next - 1]?.requiresBuildings?.forEach((r) =>
        addBuildingLevel(r.building, r.level),
      );
    }
  }
  function addBuildingLevel(building: BuildingId, level: number) {
    addCamp(building);
    if (level <= 1) return;
    const path = BUILDINGS.find((b) => b.id === building)?.paths.find((p) => p.level === level);
    if (path) addCamp(building, path.id);
  }
  function addCamp(building: BuildingId, path?: string) {
    const key = `${building}-${path ?? 'base'}`;
    if (camp.has(key)) return;
    camp.set(key, { building, path });
    if (path ? hasDevelopment(run, building, path) : run.clan.buildings[building] > 0) return;
    const definition = BUILDINGS.find((b) => b.id === building)!;
    const node = definition.paths.find((p) => p.id === path);
    if (run.clan.estate) {
      addTier(Math.max(definition.minTier ?? 1, node?.minTier ?? 1));
      node?.requiresBuildings?.forEach((r) => addBuildingLevel(r.building, r.level));
      if (node?.minLevel) addBuildingLevel(building, node.minLevel);
    }
    if (!path) return;
    addCamp(building);
    node?.requires?.forEach((p) => {
      const parent = definition.paths.find((candidate) => candidate.id === p);
      // Imported camps keep their old craft prerequisites, without retroactive level gates.
      if (run.clan.estate || !parent?.level || parent.exclusiveGroup) addCamp(building, p);
    });
  }
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
    const definition = BUILDINGS.find((b) => b.id === building)!;
    workers += path
      ? (definition.paths.find((p) => p.id === path)?.workers ?? 0)
      : definition.workers;
  }
  for (const tier of tiers) {
    const cost = estateCost(run, ENCAMPMENT_TIERS[tier - 1]!);
    materials += cost.materials;
    spirit += cost.spirit;
    workers += cost.workers;
  }
  const complete = requirements.every((r) => r.current >= r.needed);
  const closed = requirements.some((r) => r.closed);
  return { requirements, complete, closed, price: { knowledge, materials, spirit, workers } };
}
