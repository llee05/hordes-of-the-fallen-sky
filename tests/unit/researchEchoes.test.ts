import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import {
  echoVulnerability,
  recordEchoHit,
  recordShardGathering,
  remembranceEchoDamage,
  remembranceMagnetRadius,
  researchSpiritYield,
} from '../../src/game/state/researchEchoes';
function run(...ids: string[]) {
  const r = createRun();
  r.phase = 'playing';
  for (const id of ids) r.upgrades[id] = 1;
  return r;
}
describe('Ongod research effects', () => {
  it('Reverent Gathering rolls once for original pickups and never recurses', () => {
    const r = run('on-reverent-gathering');
    expect(recordShardGathering(r, 8, false, 0.09)).toBe(2);
    expect(recordShardGathering(r, 2, true, 0)).toBe(0);
    expect(recordShardGathering(r, 8, false, 0.1)).toBe(0);
    r.phase = 'paused';
    expect(recordShardGathering(r, 8, false, 0)).toBe(0);
  });
  it('Names in Stone counts actual shard pickups in fifty-shard steps up to fifteen percent', () => {
    const r = run('on-names-in-stone');
    for (let i = 0; i < 49; i++) recordShardGathering(r, 1);
    expect(researchSpiritYield(r)).toBe(1);
    recordShardGathering(r, 1);
    expect(researchSpiritYield(r)).toBe(1.01);
    for (let i = 0; i < 800; i++) recordShardGathering(r, 1);
    expect(researchSpiritYield(r)).toBe(1.15);
    expect(researchSpiritYield(createRun())).toBe(1);
  });
  it('Line of Forebears requires distinct echoes within two seconds and expires after four seconds', () => {
    const r = run('on-line-of-forebears');
    for (let i = 0; i < 3; i++) recordEchoHit(r, 0, 1, 0);
    expect(echoVulnerability(r, 0, 1)).toBe(1);
    recordEchoHit(r, 0, 1, 1);
    r.elapsed = 1.9;
    recordEchoHit(r, 0, 1, 2);
    expect(echoVulnerability(r, 0, 1)).toBe(1.15);
    expect(echoVulnerability(r, 0, 2)).toBe(1);
    r.elapsed = 5.9;
    expect(echoVulnerability(r, 0, 1)).toBe(1);
    r.elapsed = 10;
    recordEchoHit(r, 0, 1, 2);
    expect(echoVulnerability(r, 0, 1)).toBe(1);
  });
  it('Infinite Remembrance charges on ten pickups within a rolling streak then grants a bounded magnet and echo damage', () => {
    const r = run('on-infinite-remembrance');
    for (let i = 0; i < 9; i++) recordShardGathering(r, 1);
    expect(remembranceMagnetRadius(r)).toBe(0);
    recordShardGathering(r, 1);
    expect(remembranceMagnetRadius(r)).toBe(500);
    expect(remembranceEchoDamage(r)).toBe(1.2);
    r.elapsed = 4;
    expect(remembranceEchoDamage(r)).toBe(1);
    recordShardGathering(r, 1);
    r.elapsed = 8;
    recordShardGathering(r, 1);
    expect(r.researchRuntime?.shardStreak).toBe(1);
  });
});
