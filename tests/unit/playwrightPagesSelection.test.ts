import { describe, expect, it } from 'vitest';
import { pagesSmokeSelection } from '../../playwright.pages-selection';

describe('Pages smoke selection policy', () => {
  it('runs every local Pages smoke test, including @gameplay', () => {
    expect(pagesSmokeSelection({}).grepInvert).toBeUndefined();
    expect(pagesSmokeSelection({ CI: '' }).grepInvert).toBeUndefined();
    expect(pagesSmokeSelection({ E2E_HEADLESS: '1' }).grepInvert).toBeUndefined();
  });

  it.each([{ CI: 'true' }, { CI: '1' }])('excludes @gameplay from CI for %j', (environment) => {
    expect(pagesSmokeSelection(environment).grepInvert).toEqual(/@gameplay/);
  });

  it('filters the gameplay smokes but keeps the artwork smoke', () => {
    const { grepInvert } = pagesSmokeSelection({ CI: '1' });
    expect(
      grepInvert?.test(
        '@gameplay browser expedition builds, pauses, resumes, and retains its profile after reload',
      ),
    ).toBe(true);
    expect(
      grepInvert?.test(
        '@gameplay a compact browser can start and build when local storage is unavailable',
      ),
    ).toBe(true);
    expect(
      grepInvert?.test(
        'production loads all local artwork under the Pages subpath without desktop capabilities',
      ),
    ).toBe(false);
  });
});
