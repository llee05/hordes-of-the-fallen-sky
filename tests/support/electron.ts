import { _electron, test } from '@playwright/test';
import { verifyHardwareWebGL } from './graphics';

/** Electron accepts only defined environment values; preserve empty strings. */
export function electronEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

/** Electron launches do not inherit Playwright's browser launch options automatically. */
export async function launchElectron(options: Parameters<typeof _electron.launch>[0]) {
  const { headless, launchOptions } = test.info().project.use;
  const app = await _electron.launch({
    ...options,
    args: [...(launchOptions?.args ?? []), ...(options?.args ?? [])],
  });
  try {
    if (!headless) await verifyHardwareWebGL(await app.firstWindow());
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
