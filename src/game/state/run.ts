import { createClanSafety } from './clanSafety';
import { createMountedCombat } from './mountedCombat';
import { createEncounters } from './encounters';
import { createFieldState } from './fieldObjectives';
import { UPGRADES } from '../data/upgrades';
import { RESEARCH, RESEARCH_BY_ID } from '../data/research';
import {
  purchaseResearch,
  researchState,
  researchExcluded,
  validateResearchPurchase,
} from './research';
import { GAME } from '../config';
import { createLegacy } from './legacy';
import { createClan } from './clan';
import { createPatronEffects } from './patrons';
import { createStory } from './story';
import { completeGuidance } from './guidance';
import { isKhanActive } from './khan';
import type { RunState, UpgradeDefinition } from '../types';
import { startingTradition, type StartingTraditionId } from '../data/clan';
import { markExpedition } from './expeditionMetrics';

export function xpForLevel(level: number): number {
  return 8 + (level - 1) * 6;
}

export function createRun(tradition: StartingTraditionId = 'shared-hearth'): RunState {
  const { balance } = startingTradition(tradition);
  const clan = createClan();
  clan.food = balance.food;
  clan.materials = balance.materials;
  return {
    metrics: { stages: [] },
    startingTradition: tradition,
    legacy: createLegacy(),
    safety: createClanSafety(),
    combat: createMountedCombat(),
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
    clan,
    story: createStory(),
    patrons: createPatronEffects(),
    stats: {
      maxHealth: GAME.player.health,
      speed: GAME.player.speed * balance.speed,
      damage: GAME.player.damage,
      attackInterval: GAME.player.attackInterval,
      pickupRadius: GAME.player.pickupRadius * balance.pickup,
      projectiles: 1,
    },
  };
}

export function gainExperience(run: RunState, amount: number): boolean {
  run.xp += Math.max(0, amount);
  if (amount > 0) completeGuidance(run, 'shards');
  let leveled = false;
  while (run.xp >= run.nextLevelXp) {
    markExpedition(run, 'knowledge');
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
  const validation = validateResearchPurchase(researchState(run), upgrade.id, rank - 1);
  return validation.reasons[0];
}

export function applyUpgrade(
  run: RunState,
  upgrade: UpgradeDefinition,
  rank = (run.upgrades[upgrade.id] ?? 0) + 1,
): boolean {
  return applyResearch(run, upgrade.id, rank - 1);
}

/** Scene and previews use the same canonical definition and validated transition. */
export function applyResearch(
  run: RunState,
  id: string,
  expectedRank = run.upgrades[id] ?? 0,
): boolean {
  const state = researchState(run);
  const result = purchaseResearch(state, id, expectedRank);
  if (!result.allowed) return false;
  run.pendingUpgrades = state.pendingUpgrades;
  const definition = RESEARCH_BY_ID.get(id)!;
  for (const effect of definition.effects) {
    if (effect.kind === 'legacy') UPGRADES.find((u) => u.id === effect.upgradeId)!.apply(run);
  }
  markExpedition(run, 'research');
  if (run.khan.successionRemaining > 0) run.health = 0;
  completeGuidance(run, 'research');
  return true;
}

/** Only complete mastery converts banked points; locked branches keep their points. */
export function redeemMasteredResearch(run: RunState): boolean {
  if (
    run.pendingUpgrades < 1 ||
    RESEARCH.some(
      (entry) =>
        !entry.unavailableReason &&
        !researchExcluded(run, entry.id) &&
        (run.upgrades[entry.id] ?? 0) < entry.maxRank,
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
  return researchExcluded(run, upgrade.id, visited);
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)
    .toString()
    .padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}
