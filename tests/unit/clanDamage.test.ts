import { describe, expect, it } from 'vitest';
import { createDeveloperTools } from '../../src/game/dev/commands';
import type { ArenaContext } from '../../src/game/scenes/arena/ArenaContext';
import { ClanDamage } from '../../src/game/scenes/arena/ClanDamage';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';

function arena(): ArenaContext {
  return { run: createRun(), developerTools: createDeveloperTools() } as unknown as ArenaContext;
}

describe('ClanDamage', () => {
  it('damages the live run and records the cause and source, ignoring the impact point', () => {
    const context = arena();
    const clanDamage = new ClanDamage(context);
    const before = context.run.clan.integrity;
    clanDamage.damage(5, 'area', 'test shot', { x: 10, y: 20 });
    expect(context.run.clan.integrity).toBeLessThan(before);
    const pointless = arena();
    new ClanDamage(pointless).damage(5, 'area', 'test shot');
    expect(context.run.clan).toEqual(pointless.run.clan);
  });

  it('applies the development clan-invincible cheat', () => {
    const context = arena();
    const clanDamage = new ClanDamage(context);
    expect(clanDamage.protection).toBeUndefined();
    context.developerTools!.clanInvincible = true;
    expect(clanDamage.protection).toEqual({ invincible: true });
    const before = structuredClone(context.run);
    clanDamage.damage(10000);
    expect(context.run).toEqual(before);
  });
});
