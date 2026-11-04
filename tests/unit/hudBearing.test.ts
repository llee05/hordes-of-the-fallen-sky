import { expect, it } from 'vitest';
import {
  BEARING_ARROWS,
  bearingArrow,
  bearingSector,
} from '../../src/game/scenes/arena/HudPresenter';

const atDegrees = (degrees: number): [number, number] => [
  Math.cos((degrees * Math.PI) / 180),
  Math.sin((degrees * Math.PI) / 180),
];

it('points the eight screen arrows clockwise from east, with screen y pointing down', () => {
  expect(bearingArrow(1, 0)).toBe('→');
  expect(bearingArrow(1, 1)).toBe('↘');
  expect(bearingArrow(0, 1)).toBe('↓');
  expect(bearingArrow(-1, 1)).toBe('↙');
  expect(bearingArrow(-1, 0)).toBe('←');
  expect(bearingArrow(-1, -0)).toBe('←');
  expect(bearingArrow(-1, -1)).toBe('↖');
  expect(bearingArrow(0, -1)).toBe('↑');
  expect(bearingArrow(1, -1)).toBe('↗');
});

it('rounds to the nearest 45° sector, ignores distance, and points east for no offset', () => {
  expect(bearingArrow(...atDegrees(22))).toBe('→');
  expect(bearingArrow(...atDegrees(23))).toBe('↘');
  expect(bearingArrow(...atDegrees(-22))).toBe('→');
  expect(bearingArrow(...atDegrees(-23))).toBe('↗');
  expect(bearingArrow(4000, 4000)).toBe(bearingArrow(1, 1));
  expect(bearingArrow(0, 0)).toBe('→');
});

it('indexes the shared arrow table for every sector', () => {
  for (let sector = 0; sector < 8; sector += 1) {
    const [dx, dy] = atDegrees(sector * 45);
    expect(bearingSector(dx, dy)).toBe(sector);
    expect(bearingArrow(dx, dy)).toBe(BEARING_ARROWS[sector]);
  }
});
