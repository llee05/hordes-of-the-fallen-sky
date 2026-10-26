import { defineConfig } from '@playwright/test';
import { testGraphics } from './playwright.graphics';

const graphics = testGraphics();

// Exercise the production artifact beneath the same subpath as GitHub Pages.
// Keep the renderer's relative build base so this artifact also works in Electron.
// PAGES_PORT moves the preview server off the shared default for parallel work.
const port = Number(process.env.PAGES_PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const path = '/hordes-of-the-fallen-sky/';

export default defineConfig({
  testDir: './tests/pages',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  outputDir: 'test-results/pages',
  globalSetup: graphics.headless ? undefined : './tests/support/checkGraphics.ts',
  use: {
    ...graphics,
    baseURL: `${origin}${path}`,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort --base=${path}`,
    url: `${origin}${path}`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
  },
});
