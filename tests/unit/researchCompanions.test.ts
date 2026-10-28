import { claimRiderVolley } from '../../src/game/state/researchLeadership';
import { claimGhostArrow } from '../../src/game/state/researchHybrids';
import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import {
  claimEchoVolley,
  nearestCompanion,
  selectNearestCompanion,
} from '../../src/game/state/researchCompanions';
import {
  packInstinctBonus,
  researchArmorMultiplier,
  recordPiercingHitOnEnemy,
} from '../../src/game/state/researchRuntime';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { world } from './fixtures/expedition';
describe('shared research runtime integration', () => {
  it('Pack Instinct selects one closest companion across living riders and echoes, and changes echo cadence', () => {
    const r = createRun();
    r.phase = 'playing';
    r.clan.momentum = 0.8;
    r.upgrades['bc-pack-instinct'] = 1;
    r.patrons.ancestors.count = 2;
    selectNearestCompanion(r, { x: 0, y: 0 }, [
      { kind: 'rider', index: 0, x: 40, y: 0 },
      { kind: 'echo', index: 1, x: 5, y: 0 },
    ]);
    expect(nearestCompanion(r, 'echo', 1)).toBe(true);
    expect(nearestCompanion(r, 'rider', 0)).toBe(false);
    expect(packInstinctBonus(r, nearestCompanion(r, 'rider', 0)).attackSpeed).toBe(1);
    expect(claimEchoVolley(r, 0)).toBe(true);
    expect(claimEchoVolley(r, 1)).toBe(true);
    const first = r.researchRuntime!.echoFireAt!;
    expect(first[1]).toBeCloseTo(first[0]! / 1.1);
    r.elapsed = first[1]!;
    expect(claimEchoVolley(r, 1)).toBe(true);
    expect(claimEchoVolley(r, 0)).toBe(false);
    r.phase = 'paused';
    selectNearestCompanion(r, { x: 0, y: 0 }, []);
    expect(nearestCompanion(r, 'echo', 1)).toBe(true);
    expect(claimEchoVolley(r, 1)).toBe(false);
  });
  it('Sunder never creates negative armour or amplifies unarmoured targets', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['km-sunder-the-ranks'] = 1;
    for (let i = 0; i < 5; i++) recordPiercingHitOnEnemy(r, 0, 1);
    expect(researchArmorMultiplier(r, 0, 1, 1, false)).toBe(1);
    expect(researchArmorMultiplier(r, 0, 1, 0.9, false)).toBe(1);
    expect(researchArmorMultiplier(r, 0, 1, 0.5, false)).toBe(0.7);
  });
  it('saves per-companion clocks, status history, event ledgers and projectile budgets without dropping fields', () => {
    const r = createRun();
    r.researchRuntime = {
      nearestCompanion: 'echo:1',
      hoofTrailHits: { '1:0': 1, '2:0': 1 },
      echoFireAt: [2, 3],
      riderFireAt: [4],
      slowSince: { '0:1': 1 },
      slowSeenAt: { '0:1': 2 },
      slowUntil: { '0:1': 3 },
      rootUntil: { '0:1': 2.6 },
      rootCooldown: { '0:1': 10 },
      ridgePatches: [{ x: 1, y: 2, until: 4 }],
      shardsGathered: 51,
      echoHits: { '0:1:0': 5 },
      vulnerabilityUntil: { '0:1': 8 },
      firstConstructionCrossing: 1,
      crossingSpentIndex: 1,
      crossingMaterialsSpent: 42,
      rallyCrossing: 1,
      rallyUntil: 15,
      ghostAttacks: [4],
      lastStandLow: true,
      lastStandUntil: 8,
      livingWaveKey: 'wave',
      livingWaveKills: 2,
    };
    const w = world();
    w.projectiles = [
      {
        x: 1,
        y: 2,
        vx: 0,
        vy: 0,
        flip: false,
        damage: 10,
        remaining: 1,
        fire: false,
        tempest: false,
        turn: 0,
        pierces: 6,
        pins: false,
        rotation: 0,
        tint: 0xffffff,
        hits: [],
        echoIndex: 1,
        precision: false,
        ghost: true,
        baseDamage: 10,
        dealtDamage: 20,
      },
    ];
    w.hazards = [{ x: 1, y: 2, remaining: 1, researchEntered: true }];
    const decoded = decodeExpedition(captureExpedition(r, w));
    expect(decoded.run.researchRuntime).toEqual(r.researchRuntime);
    expect(decoded.world.projectiles).toEqual(w.projectiles);
    expect(decoded.world.hazards).toEqual(w.hazards);
  });
});

it('saves release clocks even when only a later companion finds a target', () => {
  const r = createRun();
  r.phase = 'playing';
  r.patrons.ancestors.count = 3;
  r.upgrades['hy-ghost-fletched-arrows'] = 1;
  expect(claimEchoVolley(r, 2)).toBe(true);
  expect(claimRiderVolley(r, 3)).toBe(true);
  claimGhostArrow(r, 2);
  expect(decodeExpedition(captureExpedition(r, world())).run.researchRuntime).toEqual(
    r.researchRuntime,
  );
});
