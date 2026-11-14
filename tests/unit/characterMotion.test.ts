import { describe, expect, it } from 'vitest';
import {
  CharacterMotion,
  CHARACTER_DIRECTIONS,
  CHARACTER_KINDS,
  characterTexture,
} from '../../src/game/animation/CharacterMotion';
import mountedSource from '/art/steppe-mounted-motion.json?raw';
import clanSource from '/art/steppe-clan-motion.json?raw';
import creatureSource from '/art/steppe-creature-motion.json?raw';
import { CHARACTER_CLASSES } from '../../src/shared/characterProfile';
import classesSource from '/art/steppe-classes-motion.json?raw';
import directionalClassesSource from '/art/steppe-classes-directional-motion.json?raw';
import femaleClassesSource from '/art/steppe-classes-female-motion.json?raw';
import femaleDirectionalClassesSource from '/art/steppe-classes-female-directional-motion.json?raw';

it('registers all four class clips to the existing rider canvas and ground anchor', () => {
  for (const source of [classesSource, femaleClassesSource]) {
    const atlas = JSON.parse(source);
    for (const classId of CHARACTER_CLASSES) {
      for (const [action, count] of [
        ['move', 4],
        ['attack', 2],
      ] as const) {
        for (let i = 0; i < count; i++) {
          const entry = atlas.frames[`${classId}-${action}-${i}`];
          expect(entry.sourceSize).toEqual({ w: 256, h: 360 });
          expect(entry.spriteSourceSize.y + entry.spriteSourceSize.h).toBe(324);
          expect(entry.frame.x + entry.frame.w).toBeLessThanOrEqual(1536);
          expect(entry.frame.y + entry.frame.h).toBeLessThanOrEqual(1024);
          expect(entry.spriteSourceSize.x + entry.spriteSourceSize.w).toBeLessThanOrEqual(256);
        }
      }
    }
    expect(Object.keys(atlas.frames).filter((name) => !name.startsWith('banner-'))).toHaveLength(
      24,
    );
  }
});

it('registers every directional class lower and upper layer to one rider canvas', () => {
  for (const [source, expectedSize] of [
    [directionalClassesSource, { w: 4096, h: 5120 }],
    [femaleDirectionalClassesSource, { w: 4096, h: 3328 }],
  ] as const) {
    const atlas = JSON.parse(source);
    for (const classId of CHARACTER_CLASSES) {
      for (const direction of CHARACTER_DIRECTIONS) {
        for (let i = 0; i < 4; i++) {
          for (const name of [
            `${classId}-${direction}-move-${i}`,
            `${classId}-${direction}-upper-move-${i}`,
          ]) {
            const entry = atlas.frames[name];
            expect(entry.sourceSize).toEqual({ w: 256, h: 360 });
            expect(entry.spriteSourceSize).toEqual({ x: 0, y: 68, w: 256, h: 256 });
          }
        }
        for (let i = 0; i < 2; i++)
          expect(atlas.frames[`${classId}-${direction}-upper-attack-${i}`]).toBeDefined();
      }
    }
    expect(Object.keys(atlas.frames)).toHaveLength(320);
    expect(atlas.meta.size).toEqual(expectedSize);
  }
});

const mounted = JSON.parse(
  mountedSource,
) as typeof import('../../public/art/steppe-mounted-motion.json');
const clan = JSON.parse(clanSource) as typeof import('../../public/art/steppe-clan-motion.json');

const creatures = JSON.parse(
  creatureSource,
) as typeof import('../../public/art/steppe-creature-motion.json');

describe('character presentation clocks', () => {
  it.each(CHARACTER_CLASSES)(
    'selects the female %s rider without changing frame names',
    (classId) => {
      const motion = new CharacterMotion('player');
      motion.setPlayerClass(classId);
      motion.setPlayerGender('woman');
      expect(motion.texture).toBe('steppe-classes-female-directional-motion');
      expect(motion.frame).toBe(`${classId}-e-move-0`);
      motion.advance(0.01, 0, true);
      expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-0`);
      motion.attack();
      expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-1`);
      expect(motion.capture()).not.toHaveProperty('gender');
    },
  );

  it.each(CHARACTER_CLASSES)(
    'selects %s art through gait, attack, pause, restore and succession',
    (classId) => {
      const motion = new CharacterMotion('player');
      motion.setPlayerClass(classId);
      expect(motion.texture).toBe('steppe-classes-directional-motion');
      expect(motion.frame).toBe(`${classId}-e-move-0`);
      const frames = new Set<string>();
      for (let i = 0; i < 20; i++) {
        motion.advance(0.05, 175);
        frames.add(motion.frame);
      }
      expect(frames.size).toBe(4);
      motion.advance(0.01, 0, true);
      expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-0`);
      motion.attack();
      const saved = motion.capture();
      motion.advance(0, 200);
      expect(motion.capture()).toEqual(saved);
      expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-1`);
      motion.reset('player');
      expect(motion.frame).toBe(`${classId}-e-move-0`);
      motion.restore(saved);
      expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-1`);
    },
  );

  it.each(CHARACTER_CLASSES)(
    'keeps the directional %s gait moving beneath independent attack poses',
    (classId) => {
      const motion = new CharacterMotion('player');
      motion.setPlayerClass(classId);
      expect(motion.texture).toBe('steppe-classes-directional-motion');
      expect(motion.frame).toBe(`${classId}-e-move-0`);
      expect(motion.upperFrame).toBe(`${classId}-e-upper-move-0`);

      const directions = new Map([
        ['e', [1, 0]],
        ['se', [1, 1]],
        ['s', [0, 1]],
        ['sw', [-1, 1]],
        ['w', [-1, 0]],
        ['nw', [-1, -1]],
        ['n', [0, -1]],
        ['ne', [1, -1]],
      ] as const);
      for (const [direction, [x, y]] of directions) {
        motion.face(x, y);
        expect(motion.frame).toContain(`-${direction}-`);
        expect(motion.upperFrame).toContain(`-${direction}-`);
      }

      motion.face(1, 0);
      motion.advance(0.01, 175, true);
      expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-0`);
      expect(motion.upperReplacesBase).toBe(true);
      motion.attack();
      const gait = new Set<string>();
      for (let i = 0; i < 3; i++) {
        motion.advance(0.05, 175);
        gait.add(motion.frame);
        expect(motion.upperFrame).toBe(`${classId}-e-upper-attack-1`);
      }
      expect(gait.size).toBeGreaterThan(1);
      expect(motion.upperReplacesBase).toBe(true);
      const saved = motion.capture();
      motion.advance(0, 0);
      expect(motion.capture()).toEqual(saved);
      motion.reset('player');
      motion.setPlayerClass(classId);
      expect(motion.frame).toBe(`${classId}-e-move-0`);
    },
  );
  it('cycles distinct locomotion frames, accelerates for gallop, and holds a grounded idle', () => {
    const rider = new CharacterMotion('player');
    const walking = new Set<string>();
    for (let i = 0; i < 20; i++) {
      rider.advance(0.05, 175);
      walking.add(rider.frame);
    }
    expect(walking.size).toBe(4);
    rider.advance(0.05, 0);
    expect(rider.frame).toBe('player-move-0');
    const trot = new CharacterMotion('player');
    const gallop = new CharacterMotion('player');
    trot.advance(0.1, 70);
    gallop.advance(0.1, 700);
    expect(trot.frame).toBe('player-move-0');
    expect(gallop.frame).toBe('player-move-1');
  });

  it('holds every visual timer when gameplay time does not advance', () => {
    const seer = new CharacterMotion('seer');
    seer.advance(0.2, 0);
    seer.attack();
    seer.hit();
    const frame = seer.frame;
    for (let i = 0; i < 100; i++) seer.advance(0, 100);
    expect(seer.frame).toBe(frame);
    expect(seer.hurt).toBe(true);
    seer.advance(0.3, 0);
    expect(seer.frame).toMatch(/^seer-move-/);
    expect(seer.hurt).toBe(false);
  });

  it('shows windup and release without changing attack timing, then resets on pool reuse', () => {
    const motion = new CharacterMotion('earth');
    motion.advance(0.05, 0, true);
    expect(motion.frame).toBe('earth-attack-0');
    motion.attack();
    expect(motion.frame).toBe('earth-attack-1');
    motion.hit();
    motion.reset('wolf', 0.5);
    expect(motion.frame).toBe('wolf-move-0');
    expect(motion.hurt).toBe(false);
    motion.advance(0.01, 50);
    expect(motion.frame).toBe('wolf-move-2');
  });

  it('desynchronizes actors with stable offsets and keeps hovering creatures alive at rest', () => {
    const a = new CharacterMotion('shade', 0);
    const b = new CharacterMotion('shade', 0.5);
    a.advance(0.05, 0);
    b.advance(0.05, 0);
    expect(a.frame).not.toBe(b.frame);
    a.advance(0.5, 0);
    expect(a.frame).not.toBe('shade-move-0');
  });
});

it('gives every actor complete clips with a constant canvas and ground registration', () => {
  for (const kind of CHARACTER_KINDS) {
    const [sheet] = characterTexture(kind);
    const campActor = sheet.includes('clan');
    const atlas = campActor ? clan : sheet.includes('mounted') ? mounted : creatures;
    const frames = atlas.frames as Record<string, (typeof mounted.frames)['player-move-0']>;
    for (const [action, count] of [
      ['move', 4],
      ['attack', 2],
    ] as const) {
      for (let index = 0; index < count; index++) {
        const entry = frames[`${kind}-${action}-${index}`]!;
        expect(entry).toBeDefined();
        expect(entry.sourceSize).toEqual(campActor ? { w: 320, h: 440 } : { w: 256, h: 360 });
        if (!campActor) expect(entry.spriteSourceSize.y + entry.spriteSourceSize.h).toBe(324);
        expect(entry.spriteSourceSize.y).toBeGreaterThanOrEqual(0);
        expect(entry.spriteSourceSize.y + entry.spriteSourceSize.h).toBeLessThanOrEqual(
          campActor ? 440 : 360,
        );
        expect(entry.spriteSourceSize.x).toBeGreaterThanOrEqual(0);
        expect(entry.spriteSourceSize.x + entry.spriteSourceSize.w).toBeLessThanOrEqual(
          campActor ? 320 : 256,
        );
        expect(entry.frame.x + entry.frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
        expect(entry.frame.y + entry.frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
      }
    }
  }
});
