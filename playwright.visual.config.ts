import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Repeatable terrain captures for visual diagnosis (tests/visual/), never compared with
// baselines. `npm run visual:orkhon` runs them under the shared browser lock; PNGs go to
// test-results/visual/orkhon/ (or VISUAL_OUTPUT_DIR). See docs/visual-workflow.md.
export default defineConfig({
  ...base,
  testDir: './tests/visual',
  testIgnore: undefined,
  grep: undefined,
  grepInvert: undefined,
  outputDir: 'test-results/visual/runs',
  use: { ...base.use, viewport: { width: 1280, height: 800 }, screenshot: 'off', trace: 'off' },
});
