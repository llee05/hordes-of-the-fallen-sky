import {
  advanceHoofTrails,
  claimHoofTrailDamage,
  echoInterval,
  echoPrefers,
  enemyStaggerSlowMultiplier,
  gallopingBarrage,
  isEnemyMarked,
  isEnemyStaggered,
  markEnemy,
  packInstinctBonus,
  recordFriendlyHitOnEnemy,
  recordGallopThroughEnemy,
  recordKhanTarget,
  recordResearchEnemyKill,
  recordResearchShard,
  researchEchoRelease,
  researchGallop,
  researchWaterRadius,
  riderAttackSpeedMultiplier,
  riderPrefersTarget,
  throatOfPreyMultiplier,
  updateEchoGuard,
  updateMarkedProximity,
  wagonResearchDefence,
  wideVolleyResearch,
} from '../../src/game/state/researchRuntime';
import { advancePatrons } from '../../src/game/state/patrons';
import { damageKhan, khanSpeedMultiplier } from '../../src/game/state/khan';
import { advanceMountedCombat } from '../../src/game/state/mountedCombat';
import { economyRates } from '../../src/game/state/economy';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { world } from './fixtures/expedition';
import { describe, expect, it } from 'vitest';
import { applyResearch } from '../../src/game/state/run';
import { createLegacyCampRun as createRun } from '../support/legacyCamp';
import { clanDamageMultiplier } from '../../src/game/state/clan';
import { researchPreviewById } from '../../src/game/state/progressionPreview';

describe('supported V2 combat slice', () => {
  it('limits barrage to personal shots in the two seconds after a real Gallop', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['hy-galloping-barrage'] = 1;
    expect(gallopingBarrage(r, true).damage).toBe(1);
    researchGallop(r);
    expect(gallopingBarrage(r, true)).toEqual({ damage: 1.1, speed: 1.2 });
    expect(gallopingBarrage(r, false).damage).toBe(1);
    r.elapsed = 2.01;
    expect(gallopingBarrage(r, true).damage).toBe(1);
  });
  it('caps River of Spirits radius, expires on active time and never changes base stats', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['hy-river-of-spirits'] = 1;
    const base = r.patrons.water.radius;
    for (let i = 0; i < 10; i++) recordResearchShard(r);
    expect(researchWaterRadius(r)).toBe(base + 25);
    expect(r.patrons.water.radius).toBe(base);
    r.elapsed = 4;
    expect(researchWaterRadius(r)).toBe(base);
  });
  it('applies Stillwater Refuge only to a living Khan with an active slowing field', () => {
    const r = createRun();
    r.phase = 'playing';
    r.health = 90;
    r.upgrades['hy-stillwater-refuge'] = 1;
    advancePatrons(r, 1);
    expect(r.health).toBe(90);
    r.patrons.water.slow = 0.12;
    advancePatrons(r, 1);
    expect(r.health).toBe(90.25);
    damageKhan(r, 10);
    expect(r.health).toBe(80.75);
    r.health = 0;
    r.khan.successionRemaining = 5;
    advancePatrons(r, 1);
    expect(r.health).toBe(0);
  });
  it('applies Deep Roots to food exhaustion, with no production on the road', () => {
    const r = createRun();
    const full = economyRates(r).foodProduction;
    r.clan.pasture = 0;
    expect(economyRates(r).foodProduction).toBe(0);
    r.upgrades['ee-deep-roots'] = 1;
    expect(economyRates(r).foodProduction).toBeCloseTo(full * 0.2);
    r.clan.stage = 'migration';
    expect(economyRates(r).foodProduction).toBe(0);
  });
  it('reduces subsequent hits within three active seconds, resets across succession', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['go-layered-felt'] = 1;
    damageKhan(r, 10);
    expect(r.health).toBe(90);
    r.elapsed = 1;
    damageKhan(r, 10);
    expect(r.health).toBe(81);
    r.elapsed = 4;
    damageKhan(r, 10);
    expect(r.health).toBe(71);
    r.khan.generation++;
    damageKhan(r, 10);
    expect(r.health).toBe(61);
    r.phase = 'paused';
    damageKhan(r, 10);
    expect(r.health).toBe(61);
  });
  it('protects resolve only above 80% living Khan health', () => {
    const r = createRun();
    const base = clanDamageMultiplier(r);
    r.upgrades['go-common-fire'] = 1;
    expect(clanDamageMultiplier(r)).toBeCloseTo(base * 0.9);
    r.health = 80;
    expect(clanDamageMultiplier(r)).toBe(base);
    r.health = 100;
    r.khan.successionRemaining = 1;
    expect(clanDamageMultiplier(r)).toBe(base);
  });
  it('gives guardian research real baseline defence with zero optional buildings', () => {
    const r = createRun();
    expect(wagonResearchDefence(r).active).toBe(false);
    r.pendingUpgrades = 10;
    for (const id of [
      'caravan-foundations',
      'caravan-foundations',
      'watchfires',
      'rolling-fortress',
    ])
      expect(applyResearch(r, id)).toBe(true);
    expect(wagonResearchDefence(r)).toMatchObject({ active: true, fallback: true, range: 260 });
    expect(wagonResearchDefence(r).damage).toBeCloseTo(0.525);
    expect(r.clan.buildings.wagon).toBe(0);
    r.clan.buildings.wagon = 1;
    expect(wagonResearchDefence(r).fallback).toBe(false);
    expect(wagonResearchDefence(r).damage).toBe(2.25);
  });
  it('round-trips runtime timers in version-1 saves and accepts older saves', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-memory-vessels'] = 1;
    recordResearchShard(r);
    expect(decodeExpedition(captureExpedition(r, world())).run.researchRuntime).toEqual(
      r.researchRuntime,
    );
    delete r.researchRuntime;
    expect(decodeExpedition(captureExpedition(r, world())).run.researchRuntime).toBeUndefined();
  });
  it('limits target priority to the hit generation and three active seconds', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-spirit-signal'] = 1;
    recordKhanTarget(r, 2, 4);
    expect(echoPrefers(r, 2, 4)).toBe(true);
    expect(echoPrefers(r, 2, 5)).toBe(false);
    r.elapsed = 3;
    expect(echoPrefers(r, 2, 4)).toBe(false);
    r.phase = 'paused';
    recordKhanTarget(r, 3, 8);
    expect(r.researchRuntime?.targetSlot).toBe(2);
  });
  it('caps shard cadence bonuses and expires rather than stacking forever', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-memory-vessels'] = 1;
    const base = echoInterval(r);
    for (let i = 0; i < 30; i++) recordResearchShard(r);
    expect(r.researchRuntime?.memoryStacks).toBe(15);
    expect(echoInterval(r)).toBeCloseTo(base / 1.15);
    r.elapsed = 4;
    expect(echoInterval(r)).toBe(base);
    recordResearchShard(r);
    expect(r.researchRuntime?.memoryStacks).toBe(1);
    r.phase = 'paused';
    recordResearchShard(r);
    expect(r.researchRuntime?.memoryStacks).toBe(1);
    expect(createRun().researchRuntime).toBeUndefined();
  });
  it('releases a capped twin every fourth echo volley, never in menus', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-ancestral-archers'] = 1;
    expect(Array.from({ length: 8 }, () => researchEchoRelease(r))).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
    r.phase = 'paused';
    expect(researchEchoRelease(r)).toBe(false);
    expect(r.researchRuntime?.echoReleases).toBe(8);
  });
  it('protects resolve only with a real echo near camp', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-quiet-council'] = 1;
    const base = clanDamageMultiplier(r);
    updateEchoGuard(r, true);
    expect(clanDamageMultiplier(r)).toBe(base);
    r.patrons.ancestors.count = 1;
    updateEchoGuard(r, true);
    expect(clanDamageMultiplier(r)).toBeCloseTo(base * 0.95);
    updateEchoGuard(r, false);
    expect(clanDamageMultiplier(r)).toBe(base);
  });
  it('widens only personal multi-arrow volleys and keeps previews free of runtime events', () => {
    const r = createRun();
    r.pendingUpgrades = 20;
    r.upgrades = { power: 2, 'wide-quiver': 1 };
    const before = structuredClone(r);
    researchPreviewById(r, 'km-feathered-fan');
    expect(r).toEqual(before);
    expect(applyResearch(r, 'km-feathered-fan')).toBe(true);
    expect(r.stats).toEqual(before.stats);
    expect(wideVolleyResearch(r, 2, true)).toEqual({ damage: 0.95, spread: 1.1 });
    expect(wideVolleyResearch(r, 1, true)).toEqual({ damage: 1, spread: 1 });
    expect(wideVolleyResearch(r, 2, false)).toEqual({ damage: 1, spread: 1 });
  });
});

describe('Börte Chino (Hunting) runtime effects', () => {
  it('marks wounded foes for 5 s with Scent of Fear and grants +10% pursuit damage on marked hits', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-scent-of-fear'] = 1;
    expect(recordFriendlyHitOnEnemy(r, 1, 1, 0.8)).toBe(1);
    expect(isEnemyMarked(r, 1, 1)).toBe(false);
    expect(recordFriendlyHitOnEnemy(r, 1, 1, 0.4)).toBe(1);
    expect(isEnemyMarked(r, 1, 1)).toBe(true);
    expect(recordFriendlyHitOnEnemy(r, 1, 1, 0.35)).toBeCloseTo(1.1);
    r.elapsed = 4;
    expect(recordFriendlyHitOnEnemy(r, 1, 1, 0.3)).toBeCloseTo(1.1);
    r.elapsed = 8;
    expect(isEnemyMarked(r, 1, 1)).toBe(true);
    r.elapsed = 9.01;
    expect(isEnemyMarked(r, 1, 1)).toBe(false);
  });

  it('staggers normal foes for 0.6 s on Gallop with a 5 s per-enemy cooldown and slows bosses', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-bounding-charge'] = 1;
    const first = recordGallopThroughEnemy(r, 0, 1, false);
    expect(first).toMatchObject({ staggered: true, staggerSeconds: 0.6, bossSlow: 1 });
    expect(isEnemyStaggered(r, 0, 1)).toBe(true);
    expect(enemyStaggerSlowMultiplier(r, 0, 1, false)).toBe(0);
    r.elapsed = 0.7;
    expect(isEnemyStaggered(r, 0, 1)).toBe(false);
    expect(recordGallopThroughEnemy(r, 0, 1, false).staggered).toBe(false);
    r.elapsed = 5.1;
    expect(recordGallopThroughEnemy(r, 0, 1, false).staggered).toBe(true);
    const boss = recordGallopThroughEnemy(r, 2, 1, true);
    expect(boss).toMatchObject({ staggered: true, bossSlow: 0.7 });
    expect(enemyStaggerSlowMultiplier(r, 2, 1, true)).toBeCloseTo(0.7);
  });

  it('grants Pack Instinct move and attack speed only to the nearest companion at high momentum', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-pack-instinct'] = 1;
    r.clan.momentum = 0.4;
    expect(packInstinctBonus(r, true)).toEqual({ moveSpeed: 1, attackSpeed: 1 });
    r.clan.momentum = 0.6;
    expect(packInstinctBonus(r, true)).toEqual({ moveSpeed: 1.15, attackSpeed: 1.1 });
    expect(packInstinctBonus(r, false)).toEqual({ moveSpeed: 1, attackSpeed: 1 });
    expect(riderAttackSpeedMultiplier(r, true)).toBeCloseTo(1.1);
    expect(riderAttackSpeedMultiplier(r, false)).toBe(1);
  });

  it('extends high momentum by 2 s up to 4 s stored on marked kills with Hounds of the Horizon', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-hounds-of-the-horizon'] = 1;
    r.clan.momentum = 0.8;
    markEnemy(r, 1, 1);
    markEnemy(r, 2, 1);
    markEnemy(r, 3, 1);
    recordResearchEnemyKill(r, { slot: 1, spawn: 1 });
    expect(r.researchRuntime?.momentumHoldUntil).toBe(2);
    recordResearchEnemyKill(r, { slot: 2, spawn: 1 });
    expect(r.researchRuntime?.momentumHoldUntil).toBe(4);
    recordResearchEnemyKill(r, { slot: 3, spawn: 1 });
    expect(r.researchRuntime?.momentumHoldUntil).toBe(4);
    advanceMountedCombat(r, 1, { x: 0, y: 0 }, false);
    expect(r.clan.momentum).toBeGreaterThan(0.5);
  });

  it('leaves a 2 s damaging hoof trail that hits each enemy at most once per dash', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-wind-cutting-hooves'] = 1;
    r.combat.gallopSerial = 1;
    advanceHoofTrails(r, { x: 100, y: 100 }, true);
    expect(claimHoofTrailDamage(r, 0, 1, 110, 100)).toBeCloseTo(r.stats.damage * 0.65);
    expect(claimHoofTrailDamage(r, 0, 1, 110, 100)).toBe(0);
    expect(claimHoofTrailDamage(r, 1, 1, 110, 100)).toBeCloseTo(r.stats.damage * 0.65);
    r.combat.gallopSerial = 2;
    advanceHoofTrails(r, { x: 100, y: 100 }, true);
    expect(claimHoofTrailDamage(r, 0, 1, 110, 100)).toBeCloseTo(r.stats.damage * 0.65);
    r.elapsed = 2.1;
    advanceHoofTrails(r, { x: 100, y: 100 }, false);
    expect(claimHoofTrailDamage(r, 2, 1, 110, 100)).toBe(0);
  });

  it('ramps Throat of the Prey damage by 3% per hit up to +24% on one marked elite and resets on switch', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-throat-of-the-prey'] = 1;
    markEnemy(r, 4, 1);
    markEnemy(r, 5, 1);
    for (let i = 1; i <= 10; i++) {
      const mult = recordFriendlyHitOnEnemy(r, 4, 1, 0.6, true);
      expect(mult).toBeCloseTo(1 + Math.min(8, i) * 0.03);
    }
    expect(throatOfPreyMultiplier(r, 4, 1)).toBeCloseTo(1.24);
    expect(recordFriendlyHitOnEnemy(r, 5, 1, 0.6, false)).toBe(1);
    expect(throatOfPreyMultiplier(r, 4, 1)).toBe(1);
  });

  it('fires Storm Chaser volley when dashing through 3+ enemies with a 4 s cooldown', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-storm-chaser'] = 1;
    r.combat.gallopSerial = 1;
    expect(recordGallopThroughEnemy(r, 0, 1).stormChaserVolley).toBe(false);
    expect(recordGallopThroughEnemy(r, 1, 1).stormChaserVolley).toBe(false);
    expect(recordGallopThroughEnemy(r, 2, 1).stormChaserVolley).toBe(true);
    expect(recordGallopThroughEnemy(r, 3, 1).stormChaserVolley).toBe(false);
    r.combat.gallopSerial = 2;
    r.elapsed = 2;
    expect(recordGallopThroughEnemy(r, 0, 2).stormChaserVolley).toBe(false);
    expect(recordGallopThroughEnemy(r, 1, 2).stormChaserVolley).toBe(false);
    expect(recordGallopThroughEnemy(r, 2, 2).stormChaserVolley).toBe(false);
    r.combat.gallopSerial = 3;
    r.elapsed = 4.1;
    recordGallopThroughEnemy(r, 0, 3);
    recordGallopThroughEnemy(r, 1, 3);
    expect(recordGallopThroughEnemy(r, 2, 3).stormChaserVolley).toBe(true);
  });

  it('prioritises marked foes and boosts rider and echo attack speed with Call of the Pack', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-call-of-the-pack'] = 1;
    r.clan.momentum = 0.7;
    markEnemy(r, 3, 2);
    expect(riderPrefersTarget(r, 3, 2)).toBe(true);
    expect(echoPrefers(r, 3, 2)).toBe(true);
    expect(riderAttackSpeedMultiplier(r)).toBeCloseTo(1.1);
    expect(echoInterval(r)).toBeCloseTo(r.patrons.ancestors.interval / 1.1);
    r.clan.momentum = 0.3;
    expect(riderPrefersTarget(r, 3, 2)).toBe(false);
  });

  it('holds momentum at 35% near marked foes and grants a 1 s speed burst on high-momentum kills with Endless Pursuit', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['bc-endless-pursuit'] = 1;
    markEnemy(r, 1, 1);
    updateMarkedProximity(r, true);
    r.clan.momentum = 0.1;
    advanceMountedCombat(r, 1, { x: 0, y: 0 }, false);
    expect(r.clan.momentum).toBeCloseTo(0.35);
    r.clan.momentum = 0.7;
    recordResearchEnemyKill(r, { slot: 1, spawn: 1 });
    expect(khanSpeedMultiplier(r)).toBeCloseTo(1.15);
    r.elapsed = 1.1;
    expect(khanSpeedMultiplier(r)).toBe(1);
    expect(decodeExpedition(captureExpedition(r, world())).run.researchRuntime).toEqual(
      r.researchRuntime,
    );
  });
});
