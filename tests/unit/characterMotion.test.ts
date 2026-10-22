import { describe, expect, it } from 'vitest';
import {
  CharacterMotion,
  CHARACTER_KINDS,
  characterTexture,
} from '../../src/game/animation/CharacterMotion';
import mountedSource from '/art/steppe-mounted-motion.json?raw';
import clanSource from '/art/steppe-clan-motion.json?raw';
import creatureSource from '/art/steppe-creature-motion.json?raw';

const mounted = JSON.parse(
  mountedSource,
) as typeof import('../../public/art/steppe-mounted-motion.json');
const clan = JSON.parse(clanSource) as typeof import('../../public/art/steppe-clan-motion.json');

const creatures = JSON.parse(
  creatureSource,
) as typeof import('../../public/art/steppe-creature-motion.json');

describe('character presentation clocks', () => {
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
