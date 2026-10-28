import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { availableFormations } from '../../src/game/state/clan';
import {
  bannerDamage,
  bannerFormation,
  claimRiderVolley,
  issueKurultai,
  leadershipAttackSpeed,
  leadershipMobility,
  leadershipProtection,
  lastWagonSpeed,
  recordEliteAppearance,
  riderPairedVolley,
} from '../../src/game/state/researchLeadership';
import { riderFiringInterval } from '../../src/game/state/researchRuntime';
function run(...ids: string[]) {
  const r = createRun();
  r.phase = 'playing';
  for (const id of ids) r.upgrades[id] = 1;
  return r;
}
describe('Sülde runtime mechanics', () => {
  it('Horn of the Host grants actual faster rider releases for five seconds with a twenty-second cooldown', () => {
    const r = run('su-horn-of-the-host');
    const base = riderFiringInterval(r);
    recordEliteAppearance(r);
    expect(riderFiringInterval(r)).toBe(base / 1.25);
    expect(claimRiderVolley(r, 0)).toBe(true);
    expect(claimRiderVolley(r, 0)).toBe(false);
    r.elapsed = base / 1.25;
    expect(claimRiderVolley(r, 0)).toBe(true);
    r.elapsed = 5;
    recordEliteAppearance(r);
    expect(leadershipAttackSpeed(r)).toBe(0);
    r.elapsed = 20;
    recordEliteAppearance(r);
    expect(leadershipAttackSpeed(r)).toBe(0.25);
    r.phase = 'paused';
    expect(claimRiderVolley(r, 1)).toBe(false);
  });
  it('Banner Formation makes Wedge, Ring and Column selectable without buildings and applies distinct effects', () => {
    const r = run('su-banner-formation');
    expect(availableFormations(r)).toEqual(['guard', 'wedge', 'retreat']);
    expect(bannerFormation(r)).toBe('Ring');
    expect(leadershipProtection(r)).toBe(0.9);
    r.clan.formation = 'wedge';
    expect(bannerDamage(r)).toBe(1.1);
    r.clan.formation = 'retreat';
    expect(leadershipMobility(r)).toBe(1.1);
    expect(leadershipProtection(r)).toBe(1);
  });
  it('The Last Wagon slows movement five percent and protects below thirty percent resolve', () => {
    const r = run('su-last-wagon');
    r.clan.integrity = 30;
    expect(leadershipProtection(r)).toBe(1);
    r.clan.integrity = 29;
    expect(leadershipProtection(r)).toBe(0.8);
    expect(leadershipMobility(r)).toBe(0.95);
    expect(lastWagonSpeed(r)).toBe(0.95);
  });
  it('The Great Kurultai is an explicit once-per-crossing command, never grants resolve twice or consumes while paused', () => {
    const r = run('su-great-kurultai');
    r.clan.integrity = 50;
    expect(issueKurultai(r)).toBe(true);
    expect(r.clan.integrity).toBe(60);
    expect(leadershipAttackSpeed(r)).toBe(0.5);
    expect(issueKurultai(r)).toBe(false);
    r.elapsed = 15;
    expect(leadershipAttackSpeed(r)).toBe(0);
    r.story.crossings.push({} as never);
    r.phase = 'paused';
    expect(issueKurultai(r)).toBe(false);
    r.phase = 'playing';
    expect(issueKurultai(r)).toBe(true);
    expect(r.clan.integrity).toBe(70);
  });
});

it('each rider counts its own paired releases while the Khan is absent', () => {
  const r = run('haste');
  r.khan.successionRemaining = 5;
  r.health = 0;
  expect(riderPairedVolley(r, 0)).toBe(false);
  for (let i = 1; i <= 4; i++) {
    expect(claimRiderVolley(r, 0)).toBe(true);
    expect(riderPairedVolley(r, 0)).toBe(i === 4);
    r.elapsed += riderFiringInterval(r);
  }
  expect(riderPairedVolley(r, 1)).toBe(false);
});

it('preserves retreat firing cadence above forty percent momentum for every rider', () => {
  const r = run();
  const base = riderFiringInterval(r);
  r.clan.formation = 'retreat';
  r.clan.momentum = 0.4;
  expect(riderFiringInterval(r)).toBe(base);
  r.clan.momentum = 0.41;
  expect(riderFiringInterval(r)).toBeCloseTo(base * 0.7);
  for (const index of [0, 1]) {
    expect(claimRiderVolley(r, index)).toBe(true);
    expect(r.researchRuntime?.riderFireAt?.[index]).toBeCloseTo(base * 0.7);
  }
  r.upgrades['su-horn-of-the-host'] = 1;
  recordEliteAppearance(r);
  expect(riderFiringInterval(r)).toBeCloseTo((base * 0.7) / 1.25);
});
