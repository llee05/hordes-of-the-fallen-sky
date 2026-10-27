import { describe, expect, it } from 'vitest';
import { drawsNothing } from '../../src/game/world3d/graphicsCommands';

describe('style-only Graphics command buffers', () => {
  it('treats the buffer Phaser seeds on every new Graphics as drawing nothing', () => {
    // The constructor calls lineStyle(1,0,0) then fillStyle(0,0).
    expect(drawsNothing([6, 1, 0, 0, 7, 0, 0])).toBe(true);
  });

  it('treats empty and cleared buffers as drawing nothing', () => {
    expect(drawsNothing([])).toBe(true);
  });

  it('treats style commands in any order as drawing nothing', () => {
    expect(drawsNothing([7, 0x78b6ae, 0.3, 6, 1, 0, 0])).toBe(true);
  });

  it('treats a drawn ring as content', () => {
    // lineStyle(2, 0xc47c60, 0.6).strokeCircle(x, y, 52): slice + strokePath.
    expect(
      drawsNothing([6, 2, 0xc47c60, 0.6, 1, 3250, 2600, 0, 52, 0, 6.283, false, 0, 2, 9]),
    ).toBe(false);
  });

  it('treats an unknown or drawing command as content', () => {
    // 0 (ARC) is not a style command.
    expect(drawsNothing([6, 1, 0, 0, 0, 3250, 2600, 52, 0, 6.283, false, 0])).toBe(false);
  });
});
