import { describe, expect, it } from 'vitest';
import { RESEARCH_BY_ID } from '../../src/game/data/research';
import { RESEARCH_EXPANSIONS } from '../../src/game/data/researchCatalogue';
import { RESEARCH_HANDLERS, type ResearchHandlerId } from '../../src/game/data/researchHandlers';
import { RESEARCH_BLOCKERS } from '../../src/game/data/researchIntegration';

import type { RunState } from '../../src/game/types';
import { createRun } from '../../src/game/state/run';
import * as runtime from '../../src/game/state/researchRuntime';
import * as terrain from '../../src/game/state/researchTerrain';
import * as echoes from '../../src/game/state/researchEchoes';
import * as leadership from '../../src/game/state/researchLeadership';
import * as guardian from '../../src/game/state/researchGuardian';
import * as hybrids from '../../src/game/state/researchHybrids';

const handlers = new Set<string>(RESEARCH_HANDLERS);

const effectScenarios = {
  'bc-scent-of-fear': [
    (r) => {
      runtime.recordFriendlyHitOnEnemy(r, 0, 1, 0.4);
      return runtime.recordFriendlyHitOnEnemy(r, 0, 1, 0.4);
    },
    1.1,
  ],
  'bc-bounding-charge': [(r) => runtime.recordGallopThroughEnemy(r, 0, 1).staggerSeconds, 0.6],
  'bc-pack-instinct': [
    (r) => {
      r.clan.momentum = 0.8;
      return runtime.packInstinctBonus(r, true);
    },
    { moveSpeed: 1.15, attackSpeed: 1.1 },
  ],
  'bc-hounds-of-the-horizon': [
    (r) => {
      r.clan.momentum = 0.8;
      runtime.markEnemy(r, 0, 1);
      runtime.recordResearchEnemyKill(r, { slot: 0, spawn: 1 });
      return runtime.researchMomentumFloor(r);
    },
    0.55,
  ],
  'bc-wind-cutting-hooves': [
    (r) => {
      r.combat.gallopSerial = 1;
      runtime.advanceHoofTrails(r, { x: 100, y: 100 }, true);
      return runtime.claimHoofTrailDamage(r, 0, 1, 100, 100);
    },
    65,
  ],
  'bc-throat-of-the-prey': [
    (r) => {
      runtime.markEnemy(r, 0, 1);
      return runtime.recordFriendlyHitOnEnemy(r, 0, 1, 0.8, true);
    },
    1.03,
  ],
  'bc-storm-chaser': [
    (r) => {
      r.combat.gallopSerial = 1;
      runtime.recordGallopThroughEnemy(r, 0, 1);
      runtime.recordGallopThroughEnemy(r, 1, 1);
      return runtime.recordGallopThroughEnemy(r, 2, 1).stormChaserVolley;
    },
    true,
  ],
  'bc-call-of-the-pack': [
    (r) => {
      r.clan.momentum = 0.8;
      runtime.markEnemy(r, 0, 1);
      return [runtime.riderPrefersTarget(r, 0, 1), runtime.riderAttackSpeedMultiplier(r)];
    },
    [true, 1.1],
  ],
  'bc-endless-pursuit': [
    (r) => {
      runtime.markEnemy(r, 0, 1);
      return runtime.researchMomentumFloor(r);
    },
    0.35,
  ],
  'ee-deep-roots': [(r) => runtime.researchGrazing(r, 0), expect.closeTo(0.2)],
  'ee-vigilant-herders': [
    (r) => {
      runtime.recordWaveEnded(r, false);
      return runtime.researchFoodProductionMultiplier(r);
    },
    1.3,
  ],
  'ee-camp-of-craftspeople': [(r) => runtime.recordMaterialSpend(r, 100), 15],
  'ee-wandering-city': [
    (r) => {
      r.clan.stage = 'migration';
      return [runtime.researchGrazing(r, 0, 100), runtime.researchMaterialGrazing(r, 0, 100)];
    },
    [0.6, 0.5],
  ],
  'ee-unbroken-seasons': [(r) => runtime.researchStarvationMultiplier(r), 0.5],
  'km-feathered-fan': [
    (r) => runtime.wideVolleyResearch(r, 2, true),
    { damage: 0.95, spread: 1.1 },
  ],
  'km-draw-to-breath': [
    (r) => {
      for (let i = 0; i < 3; i++)
        runtime.recordKhanVolley(r, 1, [{ slot: 0, spawn: 1, health: 100 }]);
      return runtime.recordFriendlyHitOnEnemy(r, 0, 1, 1);
    },
    1.2,
  ],
  'km-barbed-flight': [
    (r) => {
      runtime.recordPiercingHitOnEnemy(r, 0, 1);
      return runtime.advanceEnemyBleed(r, 0, 1, 1);
    },
    4,
  ],
  'km-eagle-eye': [(r) => runtime.researchArmorMultiplier(r, 0, 1, 0.5), 0.6],
  'km-drilling-shafts': [
    (r) => [runtime.researchBonusPierces(r, 1), runtime.projectileDamageAfterPierce(r, 100)],
    [1, 92],
  ],
  'km-arrow-rain': [
    (r) => {
      for (let i = 0; i < 5; i++)
        runtime.recordKhanVolley(r, 2, [{ slot: 0, spawn: 1, health: 100, x: 10, y: 20 }]);
      r.elapsed = 1;
      return runtime.claimArrowRainDrop(r);
    },
    { x: 10, y: 20, damage: 50, radius: 110 },
  ],
  'km-still-hand': [(r) => runtime.stillHandDamageMultiplier(r, 0.1), 1.5],
  'km-sunder-the-ranks': [
    (r) => {
      runtime.recordPiercingHitOnEnemy(r, 0, 1);
      return runtime.enemySunderArmourReduction(r, 0, 1);
    },
    0.04,
  ],
  'km-circle-of-shafts': [
    (r) => {
      r.clan.momentum = 0.8;
      return runtime.circleOfShaftsVolley(r, 2, true);
    },
    { count: 2, damage: 0.35 },
  ],
  'km-one-arrow-one-fate': [
    (r) => {
      for (let i = 0; i < 3; i++) runtime.recordKhanVolley(r, 1);
      const volley = runtime.recordKhanVolley(r, 1);
      return [volley.executionArrow, volley.damageMultiplier, volley.bonusPierces];
    },
    [true, 2.4, 1],
  ],
  'km-world-piercer': [
    (r) => [runtime.researchBonusPierces(r, 1), runtime.capWorldPiercerDamage(r, 100, 100, 250)],
    [6, 50],
  ],
  'km-sky-darkener': [
    (r) => {
      for (let i = 0; i < 5; i++) runtime.recordKhanVolley(r, 2);
      const volley = runtime.recordKhanVolley(r, 2);
      return [volley.skyDarkener, volley.damageMultiplier];
    },
    [true, 0.4],
  ],
  'go-layered-felt': [
    (r) => {
      runtime.researchKhanHitProtection(r, 10);
      return runtime.researchKhanHitProtection(r, 10);
    },
    0.9,
  ],
  'go-common-fire': [(r) => runtime.researchCommonProtection(r), 0.9],
  'go-warm-ashes': [
    (r) => {
      r.health = 50;
      runtime.recordWaveEnded(r, false);
      return r.health;
    },
    55,
  ],
  'go-embers-return': [
    (r) => {
      r.health = 20;
      runtime.recordKhanSurvivedHit(r);
      return r.health;
    },
    30,
  ],
  'go-shelter-the-wounded': [
    (r) => {
      r.health = 50;
      r.clan.integrity = 50;
      runtime.recordWaveEnded(r, false);
      return [r.health, r.clan.integrity];
    },
    [51.5, 52],
  ],
  'go-campfire-vigil': [
    (r) => {
      runtime.updateCampfireVigil(r, true);
      return runtime.researchResolveProtection(r);
    },
    0.95,
  ],
  'go-ash-born': [
    (r) => {
      runtime.recordLastEmberRevival(r);
      return runtime.claimAshBornPulse(r);
    },
    { radius: 140, push: 75 },
  ],
  'go-firebreak': [(r) => runtime.researchKhanHitProtection(r, 20), 0.5],
  'go-household-oath': [
    (r) => {
      r.clan.integrity = 50;
      runtime.healKhan(r, 10);
      return r.clan.integrity;
    },
    51,
  ],
  'go-flame-that-refuses': [
    (r) => {
      runtime.recordLastEmberRevival(r);
      r.elapsed = 1;
      return runtime.claimFlameRefusesPulse(r);
    },
    { damage: 120, radius: 150 },
  ],
  'go-fortress-of-felt': [
    (r) => {
      r.health = 20;
      runtime.healKhan(r, 10);
      return [r.health, runtime.researchKhanHitProtection(r, 10)];
    },
    [28, 0.75],
  ],
  'go-eternal-hearth': [
    (r) => {
      r.elapsed = 60;
      return runtime.eternalHearthPush(r, 50);
    },
    28,
  ],
  'lu-floodplain': [
    (r) => {
      terrain.researchEnemySlow(r, 0, 1, 10, 0.1);
      r.elapsed = 0.5;
      return terrain.researchEnemySlow(r, 0, 1, 1000, 0.5);
    },
    0.76,
  ],
  'lu-geomancers-eye': [(r) => terrain.terrainWarningBonus(r), 1],
  'lu-stone-and-stream': [(r) => terrain.researchKnockback(r, true, false), 1.2],
  'lu-undertow': [(r) => terrain.claimWaterPush(r).pull, 50],
  'lu-warning-signs': [
    (r) => {
      terrain.resolveResearchEruption(r, 0, 0, 70, { x: 80, y: 0 }, false, true);
      return terrain.terrainDodgeSpeed(r);
    },
    1.2,
  ],
  'lu-frozen-bank': [
    (r) => {
      for (let i = 0; i < 3; i++) {
        r.elapsed = i;
        terrain.researchEnemySlow(r, 0, 1, 10, 1);
      }
      return terrain.researchEnemySlow(r, 0, 1, 10, 0.1);
    },
    0,
  ],
  'lu-floodgate': [(r) => terrain.claimWaterPush(r).damage, 1.6],
  'lu-shifting-ridge': [
    (r) => {
      terrain.resolveResearchEruption(r, 0, 0, 70, { x: 80, y: 0 }, false, true);
      return terrain.inRidgePatch(r, 70, 0);
    },
    true,
  ],
  'lu-deep-current': [
    (r) => {
      for (let i = 0; i < 3; i++) {
        r.elapsed = i;
        terrain.researchEnemySlow(r, 0, 1, 10, 1);
      }
      return terrain.researchEnemySlow(r, 0, 1, 10, 0.1);
    },
    0.64,
  ],
  'lu-river-that-remembers': [
    (r) => {
      r.elapsed = 10;
      return terrain.claimTerrainWave(r).wave;
    },
    true,
  ],
  'lu-eye-of-the-mountain': [
    (r) => terrain.resolveResearchEruption(r, 0, 0, 70, { x: 0, y: 0 }, true, true),
    { immune: true, rock: true },
  ],
  'lu-land-in-motion': [
    (r) => {
      r.elapsed = 10;
      return terrain.claimTerrainWave(r).stone;
    },
    true,
  ],
  'on-reverent-gathering': [(r) => echoes.recordShardGathering(r, 8, false, 0.09), 2],
  'on-line-of-forebears': [
    (r) => {
      for (let i = 0; i < 3; i++) echoes.recordEchoHit(r, 0, 1, i);
      return echoes.echoVulnerability(r, 0, 1);
    },
    1.15,
  ],
  'on-names-in-stone': [
    (r) => {
      for (let i = 0; i < 50; i++) echoes.recordShardGathering(r, 1, false, 1);
      return echoes.researchSpiritYield(r);
    },
    1.01,
  ],
  'on-infinite-remembrance': [
    (r) => {
      for (let i = 0; i < 10; i++) echoes.recordShardGathering(r, 1, false, 1);
      return [echoes.remembranceMagnetRadius(r), echoes.remembranceEchoDamage(r)];
    },
    [500, 1.2],
  ],
  'on-spirit-signal': [
    (r) => {
      runtime.recordKhanTarget(r, 0, 1);
      return runtime.echoPrefers(r, 0, 1);
    },
    true,
  ],
  'on-memory-vessels': [
    (r) => {
      for (let i = 0; i < 15; i++) runtime.recordResearchShard(r);
      return runtime.echoInterval(r);
    },
    expect.closeTo(10 / 1.15),
  ],
  'on-quiet-council': [
    (r) => {
      r.patrons.ancestors.count = 1;
      runtime.updateEchoGuard(r, true);
      return runtime.researchResolveProtection(r);
    },
    0.95,
  ],
  'on-ancestral-archers': [
    (r) => Array.from({ length: 4 }, () => runtime.researchEchoRelease(r)),
    [false, false, false, true],
  ],
  'su-horn-of-the-host': [
    (r) => {
      leadership.recordEliteAppearance(r);
      return leadership.leadershipAttackSpeed(r);
    },
    0.25,
  ],
  'su-banner-formation': [
    (r) => {
      r.clan.formation = 'wedge';
      const damage = leadership.bannerDamage(r);
      r.clan.formation = 'guard';
      const protection = leadership.leadershipProtection(r);
      r.clan.formation = 'retreat';
      return [damage, protection, leadership.leadershipMobility(r)];
    },
    [1.1, 0.9, 1.1],
  ],
  'su-last-wagon': [
    (r) => {
      r.clan.integrity = 29;
      return [leadership.leadershipProtection(r), leadership.lastWagonSpeed(r)];
    },
    [0.8, 0.95],
  ],
  'su-great-kurultai': [
    (r) => {
      r.clan.integrity = 50;
      const issued = leadership.issueKurultai(r);
      return [issued, r.clan.integrity, leadership.leadershipAttackSpeed(r)];
    },
    [true, 60, 0.5],
  ],
  'gu-arrow-platforms': [
    (r) => {
      r.clan.buildings.wagon = 1;
      return guardian.claimArrowPlatform(r, () => true);
    },
    true,
  ],
  'gu-circling-volley': [(r) => guardian.circlingVolley(r, false, 0.149), true],
  'gu-defended-passage': [(r) => guardian.claimWardEntries(r, ['0:1']), ['0:1']],
  'gu-fast-unpacking': [
    (r) => {
      r.story.crossings.push({} as never);
      return guardian.constructionMaterials(r, true, 100);
    },
    80,
  ],
  'gu-iron-rimmed-wagons': [
    (r) => {
      r.clan.stage = 'migration';
      return [guardian.wagonDamageMultiplier(r), guardian.wagonRangeMultiplier(r)];
    },
    [1.2, 1.1],
  ],
  'gu-city-of-felt-and-wood': [(r) => guardian.constructionMaterials(r, true, 100), 60],
  'hy-ghost-fletched-arrows': [
    (r) => Array.from({ length: 5 }, () => hybrids.claimGhostArrow(r, 0)),
    [false, false, false, false, true],
  ],
  'hy-living-waters': [
    (r) => {
      r.clan.food = 10;
      r.clan.pasture = 90;
      for (let i = 0; i < 3; i++) hybrids.recordHybridKill(r, false, true);
      runtime.recordWaveEnded(r, false);
      return [r.clan.food, r.clan.pasture];
    },
    [12, 92],
  ],
  'hy-thousand-arrows': [(r) => hybrids.claimThousandArrows(r, () => true), true],
  'hy-last-stand-of-hearth': [
    (r) => {
      r.clan.integrity = 19;
      return hybrids.wardRateMultiplier(r);
    },
    2,
  ],
  'hy-blood-and-ember': [
    (r) => {
      r.health = 50;
      runtime.markEnemy(r, 0, 1);
      runtime.recordResearchEnemyKill(r, { slot: 0, spawn: 1, elite: true });
      return r.health;
    },
    58,
  ],
  'hy-galloping-barrage': [
    (r) => {
      runtime.researchGallop(r);
      return runtime.gallopingBarrage(r, true);
    },
    { damage: 1.1, speed: 1.2 },
  ],
  'hy-stillwater-refuge': [(r) => runtime.stillwaterRefuge(r), true],
  'hy-river-of-spirits': [
    (r) => {
      for (let i = 0; i < 10; i++) runtime.recordResearchShard(r);
      return runtime.researchWaterRadius(r);
    },
    125,
  ],
} satisfies Record<ResearchHandlerId, [(run: RunState) => unknown, unknown]>;

function effectRun(id?: ResearchHandlerId): RunState {
  const run = createRun();
  run.phase = 'playing';
  run.stats.damage = 100;
  run.stats.maxHealth = 100;
  run.health = 100;
  run.patrons.ancestors.interval = 10;
  run.patrons.water.radius = 100;
  run.patrons.water.slow = 0.24;
  if (id) run.upgrades[id] = 1;
  return run;
}

describe('research handler table', () => {
  it('lists each handler once, and only for a registered expansion', () => {
    expect(handlers.size).toBe(RESEARCH_HANDLERS.length);
    const expansions = new Set(RESEARCH_EXPANSIONS.map((t) => t.id));
    expect(RESEARCH_HANDLERS.filter((id) => !expansions.has(id))).toEqual([]);
  });

  it('makes every expansion either a working handler or unavailable, never both', () => {
    for (const { id } of RESEARCH_EXPANSIONS) {
      const t = RESEARCH_BY_ID.get(id)!;
      const runtime = t.effects.some((e) => e.kind === 'runtime' && e.handler === id);
      expect({ id, runtime, unavailable: Boolean(t.unavailableReason) }).toEqual({
        id,
        runtime: handlers.has(id),
        unavailable: !handlers.has(id),
      });
    }
  });

  it('keeps no blocker for an implemented handler', () => {
    expect(Object.keys(RESEARCH_BLOCKERS).filter((id) => handlers.has(id))).toEqual([]);
  });

  it('has an executable effect scenario for every registered handler', () => {
    expect(Object.keys(effectScenarios).sort()).toEqual([...RESEARCH_HANDLERS].sort());
  });

  it.each(RESEARCH_HANDLERS)('%s produces its catalogue-described effect only when owned', (id) => {
    const [exercise, expected] = effectScenarios[id];
    expect(exercise(effectRun(id))).toEqual(expected);
    expect(exercise(effectRun())).not.toEqual(expected);
  });
});
