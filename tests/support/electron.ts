import { _electron, test } from '@playwright/test';
import { verifyHardwareWebGL } from './graphics';

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
