import { describe, expect, it } from 'vitest';
import { areaSpecs, needsFullSuite, selectedTests, smokeTests } from '../../scripts/e2e-review.mjs';

describe('browser review selection', () => {
  it.each([
    'public/art/steppe.png',
    'src/game/scenes/ArenaScene.ts',
    'src/game/terrain/MountainTerrain.ts',
    'src/game/world3d/World3DRenderer.ts',
    'src/shared/expeditionSave.ts',
    'src/platform/GamePlatform.ts',
    'src/game/systems/GamepadInput.ts',
    'playwright.config.ts',
    'playwright.graphics.ts',
    'tests/support/checkGraphics.ts',
    'package.json',
    'package-lock.json',
    'scripts/e2e-review.mjs',
    'index.html',
    'new-unknown-file.ts',
  ])(
    'keeps the full suite for art, terrain, renderer, save, input, split, and config changes: %s',
    (file) => {
      expect(needsFullSuite([file])).toBe(true);
    },
  );

  it('routes modular application code and safe documentation/test changes through the fast core + area review path', () => {
    expect(
      needsFullSuite([
        'src/game/state/clan.ts',
        'src/tapestry.css',
        'src/story.md',
        'public/credits.md',
        'README.md',
        'docs/final-stand.md',
        'desktop/main.ts',
        'tests/unit/clan.test.ts',
        'tests/e2e/final-stand.spec.ts',
        'tests/e2e/helpers.ts',
      ]),
    ).toBe(false);
    expect(needsFullSuite(['README.md', 'src/game/scenes/ArenaScene.ts'])).toBe(true);
  });

  it('maps touched application areas to targeted e2e specs', () => {
    expect(areaSpecs(['src/game/state/clan.ts'])).toContain('tests/e2e/clan-safety.spec.ts');
    expect(areaSpecs(['src/ui/progressionTree.ts'])).toContain('tests/e2e/patron-removal.spec.ts');
    expect(areaSpecs(['src/game/audio/assets.ts'])).toEqual(['tests/e2e/audio.spec.ts']);
    expect(areaSpecs(['tests/e2e/zoom.spec.ts'])).toEqual(['tests/e2e/zoom.spec.ts']);
  });

  it('retains full coverage when a source file moves into a documentation path', () => {
    // git diff --no-renames retains the deleted source and the added document.
    expect(needsFullSuite(['src/removed.ts', 'docs/moved.md'])).toBe(true);
  });

  it('always runs keyboard/lifecycle and default 3D smoke tests, even with no changed tests', () => {
    expect(selectedTests({ suites: [] })).toEqual(smokeTests);
  });

  it('resolves JSON paths against the report root', () => {
    expect(
      selectedTests(
        {
          config: { rootDir: '/repo/tests/e2e' },
          suites: [
            {
              title: 'new.spec.ts',
              file: 'new.spec.ts',
              specs: [{ file: 'new.spec.ts', title: 'new case' }],
            },
          ],
        },
        '/repo/tests/e2e',
      ),
    ).toContain('new.spec.ts > new case');
  });

  it('retains nested describe titles, parameterized cases, and deduplicates smoke tests', () => {
    const report = {
      suites: [
        {
          title: 'game.spec.ts',
          file: '/repo/tests/e2e/game.spec.ts',
          specs: [
            {
              title: 'starts, moves, dashes, pauses, resumes, and resets a run',
              file: '/repo/tests/e2e/game.spec.ts',
            },
          ],
          suites: [
            {
              title: 'controls',
              file: '/repo/tests/e2e/game.spec.ts',
              specs: [{ title: 'controller A', file: '/repo/tests/e2e/game.spec.ts' }],
            },
          ],
        },
      ],
    };
    expect(selectedTests(report, '/repo/tests/e2e')).toEqual([
      ...smokeTests,
      'game.spec.ts > controls > controller A',
    ]);
  });
});
