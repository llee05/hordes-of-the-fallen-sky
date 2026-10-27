/** Local browser/Electron GPU policy; Pages CI uses headless software rendering. */
export function testGraphics(
  environment: Record<string, string | undefined> = process.env,
  platform: string = process.platform,
) {
  const headless = Boolean(environment.CI) || environment.E2E_HEADLESS === '1';
  const args = headless
    ? []
    : [
        ...(platform === 'linux'
          ? [
              ...(environment.WAYLAND_DISPLAY ? ['--ozone-platform=wayland'] : []),
              '--use-gl=angle',
              '--use-angle=gl',
            ]
          : []),
        `--class=${environment.E2E_WINDOW_CLASS || 'bh-e2e-test'}`,
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ];
  return {
    headless,
    launchOptions: { executablePath: environment.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args },
  };
}
