import { defineConfig } from '@playwright/test';
import { testGraphics } from './playwright.graphics';

const graphics = testGraphics();

export default defineConfig({
  testDir: './tests/desktop',
  grep: process.env.BH_PERF_TESTS === '1' ? /@perf/ : undefined,
  grepInvert: process.env.BH_PERF_TESTS === '1' ? undefined : /@perf/,
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  outputDir: 'test-results/desktop',
  use: {
    headless: graphics.headless,
    launchOptions: { args: graphics.launchOptions.args },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
