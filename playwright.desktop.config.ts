import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/desktop',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  outputDir: 'test-results/desktop',
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
