import { defineConfig } from '@playwright/test';
import { testGraphics } from './playwright.graphics';

const graphics = testGraphics();

// Exercise the production artifact beneath the same subpath as GitHub Pages.
// Keep the renderer's relative build base so this artifact also works in Electron.
const origin = 'http://127.0.0.1:4173';
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
    command: `npm run preview -- --port 4173 --strictPort --base=${path}`,
    url: `${origin}${path}`,
    reuseExistingServer: false,
  },
});
