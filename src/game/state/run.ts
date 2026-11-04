import { GAME } from '../config';
import { startingTradition, type StartingTraditionId } from '../data/clan';
import type { RunState } from '../types';
import { createClan } from './clan';
import { createClanSafety } from './clanSafety';
import { createEncounters } from './encounters';
import { createFieldState } from './fieldObjectives';
import { completeGuidance } from './guidance';
import { createLegacy } from './legacy';
import { createMountedCombat } from './mountedCombat';
import { initializeNomadicCamp, nomadicExperienceMultiplier } from './nomadicCamp';
import { createStory } from './story';

export function xpForLevel(level: number): number {
  return 8 + (level - 1) * 6;
}

export function createRun(tradition: StartingTraditionId = 'shared-hearth'): RunState {
  const { balance } = startingTradition(tradition);
  const clan = createClan();
  clan.food = balance.food;
  clan.materials = balance.materials;
  const run: RunState = {
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
    clan,
    story: createStory(),
    stats: {
      maxHealth: GAME.player.health,
      speed: GAME.player.speed * balance.speed,
      damage: GAME.player.damage,
      attackInterval: GAME.player.attackInterval,
      pickupRadius: GAME.player.pickupRadius * balance.pickup,
      projectiles: 1,
      pierce: 0,
    },
  };
  initializeNomadicCamp(run);
  return run;
}

export function gainExperience(run: RunState, amount: number): boolean {
  run.xp += Math.max(0, amount) * nomadicExperienceMultiplier(run);
  if (amount > 0) completeGuidance(run, 'shards');
  let leveled = false;
  while (run.xp >= run.nextLevelXp) {
    run.xp -= run.nextLevelXp;
    run.level += 1;
    run.nextLevelXp = xpForLevel(run.level);
    leveled = true;
  }
  return leveled;
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)
    .toString()
    .padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}
