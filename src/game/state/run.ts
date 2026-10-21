import { GAME } from '../config';
import { createClan } from './clan';
import type { RunState, UpgradeDefinition } from '../types';

export function xpForLevel(level: number): number {
  return 8 + (level - 1) * 6;
}

export function createRun(): RunState {
  return {
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

export function applyUpgrade(run: RunState, upgrade: UpgradeDefinition): boolean {
  const stacks = run.upgrades[upgrade.id] ?? 0;
  if (run.pendingUpgrades < 1 || stacks >= upgrade.maxStacks) return false;
  upgrade.apply(run);
  run.upgrades[upgrade.id] = stacks + 1;
  run.pendingUpgrades -= 1;
  return true;
}

export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)
    .toString()
    .padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}
