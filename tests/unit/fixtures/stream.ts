import type { LandscapeDefinition } from '../../../src/game/data/landscapes';

/** A narrow single-channel meadow stream for river geometry tests on a dry real place. */
export const MEADOW_STREAM: NonNullable<LandscapeDefinition['water']> = {
  kind: 'stream',
  width: 36,
  color: 0x719c94,
  bank: 0x98a873,
  course: [-2600, -380, -900, -350, 0, -310, 950, -430, 2600, -320],
};
