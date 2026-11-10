import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Reference scenes only: fixed screenshots compared with committed baselines at
// 1280x800. `npm run test:reference` runs it under the shared browser lock; see
// docs/developer-mode.md#reference-scenes.
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: 'reference-scenes.spec.ts',
  grep: undefined,
  grepInvert: undefined,
  outputDir: 'test-results/reference',
  expect: {
    ...base.expect,
    // Screenshot comparison waits for two identical consecutive captures.
    timeout: 20_000,
    toHaveScreenshot: {
      // Absorb antialiasing noise; real art or layout changes move far more pixels.
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: { ...base.use, viewport: { width: 1280, height: 800 } },
});
