import { describe, expect, it } from 'vitest';
import { testGraphics } from '../../playwright.graphics';

describe('Playwright graphics policy', () => {
  it('uses visible hardware rendering on a local Wayland desktop', () => {
    const graphics = testGraphics(
      { WAYLAND_DISPLAY: 'wayland-1', PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/usr/bin/chromium' },
      'linux',
    );
    expect(graphics.headless).toBe(false);
    expect(graphics.launchOptions.executablePath).toBe('/usr/bin/chromium');
    expect(graphics.launchOptions.args).toEqual(
      expect.arrayContaining([
        '--ozone-platform=wayland',
        '--use-gl=angle',
        '--use-angle=gl',
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ]),
    );
  });

  it.each([{ CI: 'true' }, { CI: '1', E2E_HEADLESS: '0' }, { E2E_HEADLESS: '1' }])(
    'keeps headless software defaults for %j even with a local display',
    (environment) => {
      const graphics = testGraphics({ ...environment, WAYLAND_DISPLAY: 'wayland-1' }, 'linux');
      expect(graphics.headless).toBe(true);
      expect(graphics.launchOptions.args).toEqual([]);
      expect(graphics.launchOptions.executablePath).toBeUndefined();
    },
  );

  it('does not force Wayland on X11 or Linux GL flags on other platforms', () => {
    expect(testGraphics({}, 'linux').launchOptions.args).not.toContain('--ozone-platform=wayland');
    for (const platform of ['darwin', 'win32']) {
      const graphics = testGraphics({ WAYLAND_DISPLAY: 'wayland-1' }, platform);
      expect(graphics.headless).toBe(false);
      expect(graphics.launchOptions.args.some((arg) => /ozone|use-gl|use-angle/.test(arg))).toBe(
        false,
      );
      expect(graphics.launchOptions.args).toContain('--enable-gpu');
    }
  });
});
