import { describe, expect, it } from 'vitest';
import { needsFullSuite, selectedTests, smokeTests } from '../../scripts/e2e-review.mjs';

describe('browser review selection', () => {
  it.each([
    'src/game/state/clan.ts',
    'src/tapestry.css',
    'src/story.md',
    'public/credits.md',
    'public/art/steppe.png',
    'playwright.config.ts',
    'playwright.graphics.ts',
    'tests/support/checkGraphics.ts',
    'package.json',
    'package-lock.json',
    'scripts/e2e-review.mjs',
    'index.html',
    'new-unknown-file.ts',
  ])('keeps the full suite for application/config/unknown changes: %s', (file) => {
    expect(needsFullSuite([file])).toBe(true);
  });

  it('allows docs, native-only changes, and browser test edits through the import selector', () => {
    expect(
      needsFullSuite([
        'README.md',
        'docs/final-stand.md',
        'desktop/main.ts',
        'tests/unit/clan.test.ts',
        'tests/e2e/final-stand.spec.ts',
        'tests/e2e/helpers.ts',
      ]),
    ).toBe(false);
    expect(needsFullSuite(['README.md', 'src/main.ts'])).toBe(true);
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
