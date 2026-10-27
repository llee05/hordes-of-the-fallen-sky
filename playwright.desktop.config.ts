import { defineConfig } from '@playwright/test';
import { testGraphics } from './playwright.graphics';

const graphics = testGraphics();

export default defineConfig({
  testDir: './tests/desktop',
  fullyParallel: false,
  workers: 1,
  timeout: graphics.headless ? 120000 : 45000,
  expect: { timeout: graphics.headless ? 15000 : 5000 },
  outputDir: 'test-results/desktop',
  use: {
    headless: graphics.headless,
    launchOptions: {
      args:
        graphics.headless && process.platform === 'linux'
          ? [
              ...(process.env.ELECTRON_XVFB === '1'
                ? ['--ozone-platform=x11']
                : [
                    '--ozone-platform=headless',
                    // Ozone otherwise exposes a 1×1 display, which clamps the native window.
                    '--ozone-override-screen-size=1920,1080',
                  ]),
              '--use-angle=swiftshader',
              '--enable-unsafe-swiftshader',
              '--disable-background-timer-throttling',
              '--disable-renderer-backgrounding',
              '--disable-backgrounding-occluded-windows',
            ]
          : graphics.launchOptions.args,
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
