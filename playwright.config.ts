import { defineConfig } from '@playwright/test';
import { testGraphics } from './playwright.graphics';

const graphics = testGraphics();

// Parallel agent worktrees share one host, so the dev-server port moves with
// E2E_PORT instead of colliding on the shared default. E2E_REUSE_SERVER=1 opts
// back into reusing an already-running server; by default every run starts its
// own so a worktree never tests another worktree's server.
const port = Number(process.env.E2E_PORT || 5173);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  grep: process.env.BH_PERF_TESTS === '1' ? /@perf/ : undefined,
  grepInvert: process.env.BH_PERF_TESTS === '1' ? undefined : /@perf/,
  fullyParallel: false,
  workers: 1,
  expect: { timeout: process.env.CI ? 15000 : 5000 },
  outputDir: 'test-results/browser',
  globalSetup: graphics.headless ? undefined : './tests/support/checkGraphics.ts',
  use: {
    ...graphics,
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev:web -- --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
  },
});
