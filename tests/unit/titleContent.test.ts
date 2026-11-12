import { describe, expect, it } from 'vitest';
import { titleMenuContent } from '../../src/ui/titleContent';

describe('painted title navigation', () => {
  it('keeps the requested conditional actions in their authored order', () => {
    const html = titleMenuContent({
      latestSaveSlot: 'slot-2',
      hasCamp: true,
      developer: true,
      desktop: true,
    });
    expect([...html.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'continue-expedition',
      'begin',
      'continue-camp',
      'saves',
      'settings',
      'developer',
      'quit',
    ]);
    expect(html).toContain('data-slot="slot-2" data-primary');
    expect(html).toContain('>Load<');
    expect(html).toContain('>Quit<');
  });

  it('omits unavailable actions and removed title shortcuts', () => {
    const html = titleMenuContent({
      hasCamp: false,
      developer: false,
      desktop: false,
    });
    expect(html).not.toContain('continue-expedition');
    expect(html).not.toContain('continue-camp');
    expect(html).not.toContain('Developer mode');
    expect(html).not.toContain('data-action="quit"');
    expect(html).not.toContain('Starting tradition');
    expect(html).not.toContain('How to play');
    expect(html).not.toContain('Saved expeditions');
    expect(html).toContain('data-action="begin" data-primary');
  });
});
