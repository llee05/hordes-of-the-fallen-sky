import { createEncounters } from './encounters';
import { createFieldState } from './fieldObjectives';
import { UPGRADES } from '../data/upgrades';
import { GAME } from '../config';
import { createLegacy } from './legacy';
import { createClan } from './clan';
import { createPatronEffects } from './patrons';
import { createStory } from './story';
import { completeGuidance } from './guidance';
import { isKhanActive } from './khan';
import type { RunState, UpgradeDefinition } from '../types';

export function xpForLevel(level: number): number {
  return 8 + (level - 1) * 6;
}

export function createRun(): RunState {
  return {
    legacy: createLegacy(),
    encounters: createEncounters(),
    field: createFieldState(),
    guidance: { enabled: true, completed: [] },
    khan: { generation: 1, successionRemaining: 0 },
    phase: 'ready',
    elapsed: 0,
    health: GAME.player.health,
    kills: 0,
    level: 1,
    xp: 0,
    nextLevelXp: xpForLevel(1),
    pendingUpgrades: 0,
    upgrades: {},
    clan: createClan(),
    story: createStory(),
    patrons: createPatronEffects(),
    stats: {
      maxHealth: GAME.player.health,
      speed: GAME.player.speed,
      damage: GAME.player.damage,
      attackInterval: GAME.player.attackInterval,
      pickupRadius: GAME.player.pickupRadius,
      projectiles: 1,
    },
  };
}

export function gainExperience(run: RunState, amount: number): boolean {
  run.xp += Math.max(0, amount);
  if (amount > 0) completeGuidance(run, 'shards');
  let leveled = false;
  while (run.xp >= run.nextLevelXp) {
    run.xp -= run.nextLevelXp;
    run.level += 1;
    run.pendingUpgrades += 1;
    run.nextLevelXp = xpForLevel(run.level);
    leveled = true;
  }
  return leveled;
}

export function upgradeBlocker(
  run: RunState,
  upgrade: UpgradeDefinition,
  rank = (run.upgrades[upgrade.id] ?? 0) + 1,
): string | undefined {
  const stacks = run.upgrades[upgrade.id] ?? 0;
  if (rank <= stacks || stacks >= upgrade.maxStacks) return 'Already learned';
  if (!Number.isInteger(rank) || rank !== stacks + 1) return `Requires rank ${rank - 1}`;
  if (upgradeExcluded(run, upgrade)) return 'Another specialization chosen';
  for (const requirement of upgrade.requires ?? []) {
    if ((run.upgrades[requirement.id] ?? 0) < requirement.rank) {
      const title = UPGRADES.find((entry) => entry.id === requirement.id)?.title ?? requirement.id;
      return `Requires ${title} rank ${requirement.rank}`;
    }
  }
  const cost = upgradeCost(upgrade);
  if (!Number.isInteger(cost) || cost < 1) return 'Invalid research cost';
  if (run.pendingUpgrades < cost)
    return `Needs ${cost} knowledge point${cost === 1 ? '' : 's'} (${run.pendingUpgrades} available)`;
  return undefined;
}

export function applyUpgrade(
  run: RunState,
  upgrade: UpgradeDefinition,
  rank = (run.upgrades[upgrade.id] ?? 0) + 1,
): boolean {
  const stacks = run.upgrades[upgrade.id] ?? 0;
  if (upgradeBlocker(run, upgrade, rank)) return false;
  upgrade.apply(run);
  if (run.khan.successionRemaining > 0) run.health = 0;
  run.upgrades[upgrade.id] = stacks + 1;
  run.pendingUpgrades -= upgradeCost(upgrade);
  completeGuidance(run, 'research');
  return true;
}

/** Only complete mastery converts banked points; locked branches keep their points. */
export function redeemMasteredResearch(run: RunState): boolean {
  if (
    run.pendingUpgrades < 1 ||
    UPGRADES.some(
      (entry) => !upgradeExcluded(run, entry) && (run.upgrades[entry.id] ?? 0) < entry.maxStacks,
    )
  )
    return false;
  if (isKhanActive(run)) run.health = run.stats.maxHealth;
  run.clan.food += run.pendingUpgrades * 20;
  run.clan.materials += run.pendingUpgrades * 15;
  run.pendingUpgrades = 0;
  run.clan.message =
    'Every tradition is mastered. Each knowledge point supplies 20 food and 15 materials.';
  return true;
}

export function upgradeCost(upgrade: UpgradeDefinition): number {
  return upgrade.knowledgeCost ?? 1;
}
/** Groups are local to a patron. Exclusion propagates through dependent technologies. */
export function upgradeExcluded(
  run: RunState,
  upgrade: UpgradeDefinition,
  visited = new Set<string>(),
): boolean {
  if (visited.has(upgrade.id)) return false;
  visited.add(upgrade.id);
  if (
    upgrade.exclusiveGroup &&
    UPGRADES.some(
      (other) =>
        other.id !== upgrade.id &&
        other.patron === upgrade.patron &&
        other.exclusiveGroup === upgrade.exclusiveGroup &&
        (run.upgrades[other.id] ?? 0) > 0,
    )
  )
    return true;
  return (upgrade.requires ?? []).some((requirement) => {
    const parent = UPGRADES.find((entry) => entry.id === requirement.id);
    return parent ? upgradeExcluded(run, parent, new Set(visited)) : false;
  });
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)
    .toString()
    .padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}
