import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classMotionFromAtlas, type MotionAtlas } from '../../src/ui/creator/riderPreview';
import type { CharacterClassId } from '../../src/shared/characterProfile';

describe('character creator rider atlas', () => {
  it('registers four movement and two attack frames for every playable class', () => {
    const atlas = JSON.parse(
      readFileSync(new URL('../../public/art/steppe-classes-motion.json', import.meta.url), 'utf8'),
    ) as MotionAtlas;
    const classes: CharacterClassId[] = [
      'mounted-archer',
      'lancer',
      'iron-pagoda',
      'spirit-caller',
    ];

    for (const classId of classes) {
      const motion = classMotionFromAtlas(atlas, classId);
      expect(motion.move, classId).toHaveLength(4);
      expect(motion.attack, classId).toHaveLength(2);
      expect([...motion.move, ...motion.attack].every((frame) => frame.w > 0 && frame.h > 0)).toBe(
        true,
      );
    }
  });
});
