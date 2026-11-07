import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MANUSCRIPT_COLORS, MANUSCRIPT_PALETTE } from '../../src/ui/manuscriptPalette';

describe('medieval manuscript visual foundations', () => {
  it('defines the canonical manuscript pigment palette in hex and numeric form', () => {
    expect(MANUSCRIPT_PALETTE.agedParchment).toBe('#d9c8a5');
    expect(MANUSCRIPT_PALETTE.lightParchment).toBe('#e8d9b9');
    expect(MANUSCRIPT_PALETTE.darkInk).toBe('#43382c');
    expect(MANUSCRIPT_PALETTE.fadedOchre).toBe('#ad824d');
    expect(MANUSCRIPT_PALETTE.terracotta).toBe('#98614d');
    expect(MANUSCRIPT_PALETTE.sageGreen).toBe('#7d896c');
    expect(MANUSCRIPT_PALETTE.dustyBlue).toBe('#607a8b');
    expect(MANUSCRIPT_PALETTE.fadedBurgundy).toBe('#794e4c');

    expect(MANUSCRIPT_COLORS.agedParchment).toBe(0xd9c8a5);
    expect(MANUSCRIPT_COLORS.lightParchment).toBe(0xe8d9b9);
    expect(MANUSCRIPT_COLORS.darkInk).toBe(0x43382c);
    expect(MANUSCRIPT_COLORS.fadedOchre).toBe(0xad824d);
    expect(MANUSCRIPT_COLORS.terracotta).toBe(0x98614d);
    expect(MANUSCRIPT_COLORS.sageGreen).toBe(0x7d896c);
    expect(MANUSCRIPT_COLORS.dustyBlue).toBe(0x607a8b);
    expect(MANUSCRIPT_COLORS.fadedBurgundy).toBe(0x794e4c);
  });

  it('provides reusable manuscript UI component styles and CSS custom properties', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/manuscript.css'), 'utf8');
    for (const token of [
      '--ms-parchment-aged: #d9c8a5',
      '--ms-parchment-light: #e8d9b9',
      '--ms-ink: #43382c',
      '--ms-ochre: #ad824d',
      '--ms-terracotta: #98614d',
      '--ms-sage: #7d896c',
      '--ms-dusty-blue: #607a8b',
      '--ms-burgundy: #794e4c',
    ]) {
      expect(css).toContain(token);
    }

    for (const componentSelector of [
      '.ms-panel',
      '.ms-button',
      '.ms-tabs',
      '.ms-frame',
      '.ms-tooltip',
      '.ms-slot',
      '.ms-selection',
      '.ms-progress',
      '.ms-resource',
      '.ms-dialog',
    ]) {
      expect(css).toContain(componentSelector);
    }
  });
});
