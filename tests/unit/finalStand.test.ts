import { expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { createRun } from '../../src/game/state/run';
import { advanceClan } from '../../src/game/state/clan';
import {
  syncFinalStand,
  advanceFinalStand,
  passageBonus,
  finalChapter,
  acceptCampBarrage,
  defeatSkybreaker,
} from '../../src/game/state/finalStand';
function finale() {
  const run = createRun();
  run.phase = 'playing';
  run.clan.region = 3;
  run.clan.stage = 'final';
  syncFinalStand(run);
  return run;
}
it('warns before one release, exposes recovery, rotates approaches and never catches up through menus', () => {
  const run = finale(),
    state = run.finalStand!;
  expect(advanceFinalStand(run, 6, true, { x: 0, y: 0 }, [])).toBe('warning');
  expect(advanceFinalStand(run, 2, true, { x: 0, y: 0 }, [])).toBeUndefined();
  expect(advanceFinalStand(run, 0.4, true, { x: 0, y: 0 }, [])).toBe('release');
  run.phase = 'paused';
  const paused = structuredClone(state);
  advanceFinalStand(run, 100, true, { x: 0, y: 0 }, []);
  expect(state).toEqual(paused);
  run.phase = 'playing';
  expect(advanceFinalStand(run, 4, true, { x: 0, y: 0 }, [])).toBe('approach');
  expect(state.approach).toBe(1);
  expect(state.cycle).toBe(1);
  expect(acceptCampBarrage(run, 1)).toBe(true);
  expect(acceptCampBarrage(run, 1)).toBe(false);
  expect(acceptCampBarrage(run, 0)).toBe(false);
  expect(acceptCampBarrage(run, 2)).toBe(true);
});
it('work parties require a living nearby Khan, clear ground and their unlock; rewards never repeat', () => {
  const run = finale(),
    state = run.finalStand!;
  state.works[0]!.x = state.works[0]!.y = 0;
  advanceFinalStand(run, 10, false, { x: 0, y: 0 }, [false]);
  expect(passageBonus(run)).toBe(0);
  run.clan.stageTime = 40;
  advanceFinalStand(run, 10, false, { x: 0, y: 0 }, [true]);
  expect(passageBonus(run)).toBe(0);
  run.health = 0;
  run.khan.successionRemaining = 4;
  advanceFinalStand(run, 10, false, { x: 0, y: 0 }, [false]);
  expect(passageBonus(run)).toBe(0);
  run.health = 100;
  run.khan.successionRemaining = 0;
  advanceFinalStand(run, 5, false, { x: 0, y: 0 }, [false]);
  expect(passageBonus(run)).toBe(12);
  advanceFinalStand(run, 5, false, { x: 0, y: 0 }, [false]);
  expect(passageBonus(run)).toBe(12);
});
it('reaches all three chapters and permits survival victory with the Skybreaker alive', () => {
  const run = finale();
  expect(finalChapter(run)).toBe(0);
  run.clan.stageTime = 70;
  expect(finalChapter(run)).toBe(1);
  run.clan.stageTime = 130;
  expect(finalChapter(run)).toBe(2);
  run.clan.stageTime = 179.9;
  run.clan.finalBossSpawned = true;
  expect(advanceClan(run, 0.1)).toBe('saved');
  expect(run.clan.finalBossDefeated).toBe(false);
  run.clan.stageTime = 167.9;
  run.finalStand!.works[0]!.done = true;
  expect(advanceClan(run, 0.1)).toBe('saved');
});
it('the Skybreaker falls once: flag, capped resolve, and a single remembered moment', () => {
  const run = finale();
  run.clan.integrity = 50;
  const before = run.legacy.totalMemories;
  expect(defeatSkybreaker(run)).toBe(true);
  expect(run.clan.finalBossDefeated).toBe(true);
  expect(run.clan.integrity).toBe(50 + GAME.finalStand.bossResolve);
  expect(run.legacy.totalMemories).toBe(before + 1);
  const memory = run.legacy.memories.at(-1)!;
  expect(memory.title).toBe('The Skybreaker fell');
  expect(memory.line?.speaker).toBe('boro');
  const settled = structuredClone({ clan: run.clan, legacy: run.legacy });
  expect(defeatSkybreaker(run)).toBe(false);
  expect({ clan: run.clan, legacy: run.legacy }).toEqual(settled);

  const full = finale();
  full.clan.integrity = 100 - GAME.finalStand.bossResolve / 2;
  defeatSkybreaker(full);
  expect(full.clan.integrity).toBe(100);
});
it('the Skybreaker memory follows the remnant voice and Camp scenes: Off', () => {
  const remnant = finale();
  remnant.clan.population = 3;
  defeatSkybreaker(remnant);
  expect(remnant.legacy.memories.at(-1)!.line).toEqual({
    speaker: 'clan',
    text: 'The great creature lies still, and the few who remain turn back to the wagons.',
  });
  const quiet = finale();
  quiet.story.enabled = false;
  defeatSkybreaker(quiet);
  expect(quiet.legacy.memories).toHaveLength(1);
  expect(quiet.legacy.memories[0]!.line).toBeUndefined();
});
