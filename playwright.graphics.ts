/** Shared browser/Electron test policy; CI retains Playwright's software-rendered defaults. */
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
