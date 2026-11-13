import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARACTER_CLASSES } from '../../src/shared/characterProfile';
import { classDefinition } from '../../src/game/data/classes';
import { CLASS_ATTACK_CUES } from '../../src/game/scenes/arena/ArenaEffects';

const slug = (name: string) => name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');

describe('playable class attack presentation', () => {
  it('has an authored animation cue for every basic, heavy, and ability attack', () => {
    const attacks = CHARACTER_CLASSES.flatMap((classId) => {
      const definition = classDefinition(classId);
      return [
        definition.basicAttack.name,
        definition.heavyAttack.name,
        ...definition.abilities.map((ability) => ability.name),
      ].map((name) => `${classId}:${slug(name)}`);
    });

    expect(CLASS_ATTACK_CUES).toEqual(attacks);
  });

  it('ships the Spirit Caller wisp as a compact transparent PNG', () => {
    const png = readFileSync('public/art/spirit-wisp.png');
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(96);
    expect(png.readUInt32BE(20)).toBe(64);
    expect(png[25]).toBe(6);
    expect(png.byteLength).toBeGreaterThan(1000);
  });
});
