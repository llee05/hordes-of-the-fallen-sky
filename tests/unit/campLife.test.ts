import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { buildStructure } from '../../src/game/state/clan';
import {
  campWorkers,
  campWorkerPosition,
  campShelters,
  CAMP_LIFE_LIMITS,
} from '../../src/game/state/campLife';
import { CharacterMotion } from '../../src/game/animation/CharacterMotion';

describe('life around the travelling camp', () => {
  it('assigns visible representatives to established work and stays bounded after growth and loss', () => {
    const run = createRun();
    expect(campWorkers(run)).toHaveLength(8);
    expect(campWorkers(run).every((job) => job === 'ger')).toBe(true);
    run.phase = 'building';
    buildStructure(run, 'archery');
    expect(campWorkers(run)).toContain('archery');
    expect(campWorkers(run)).not.toContain('felt');
    run.clan.population = 120;
    expect(campWorkers(run)).toHaveLength(CAMP_LIFE_LIMITS.workers);
    expect(campShelters(run)).toHaveLength(6);
    run.clan.population = 1;
    expect(campWorkers(run)).toHaveLength(1);
    run.clan.population = 0;
    expect(campWorkers(run)).toHaveLength(0);
  });

  it('connects camp jobs to shared stores and arranges travelling rows without changing resources', () => {
    const run = createRun();
    const stores = campWorkerPosition(run, 0, 'felt');
    run.elapsed = 6;
    const work = campWorkerPosition(run, 0, 'felt');
    expect(work.x).toBeLessThan(stores.x);
    run.clan.stage = 'migration';
    const before = structuredClone(run);
    expect(campWorkerPosition(run, 0, 'felt')).toEqual({ x: -150, y: 72 });
    expect(campWorkerPosition(run, 0, 'felt', false)).toEqual(work);
    expect(run).toEqual(before);
  });

  it('uses distinct resting and walking poses on the same active-time character clock', () => {
    for (const kind of ['worker', 'packhorse'] as const) {
      const motion = new CharacterMotion(kind);
      const resting = new Set<string>();
      for (let i = 0; i < 40; i++) {
        motion.advance(0.1, 0);
        resting.add(motion.frame);
      }
      expect(resting.size).toBe(2);
      const moving = new Set<string>();
      for (let i = 0; i < 40; i++) {
        motion.advance(0.1, 30);
        moving.add(motion.frame);
      }
      expect(moving.size).toBe(4);
      const frame = motion.frame;
      motion.advance(0, 100);
      expect(motion.frame).toBe(frame);
    }
  });
});
