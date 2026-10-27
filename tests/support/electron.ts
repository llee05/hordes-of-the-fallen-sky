import { _electron, test, type TestInfo } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { verifyHardwareWebGL } from './graphics';

const traces = new Map<TestInfo, string[]>();

// Manually launched Electron contexts do not use Playwright's browser trace fixture.
test.afterEach(async ({}, info) => {
  const paths = traces.get(info) ?? [];
  traces.delete(info);
  for (const path of paths) {
    if (info.status !== info.expectedStatus)
      await info.attach('electron-trace', { path, contentType: 'application/zip' });
    else await rm(path, { force: true });
  }
});

/** Electron launches do not inherit Playwright's browser launch options automatically. */
export async function launchElectron(options: Parameters<typeof _electron.launch>[0]) {
  const { headless, launchOptions } = test.info().project.use;
  const app = await _electron.launch({
    ...options,
    args: [...(launchOptions?.args ?? []), ...(options?.args ?? [])],
  });
  try {
    // Even specs disabling the browser fixture trace need native failure diagnostics in CI.
    if (headless) {
      const info = test.info();
      const paths = traces.get(info) ?? [];
      traces.set(info, paths);
      const path = info.outputPath(`electron-trace-${paths.length + 1}.zip`);
      await app.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
      const close = app.close.bind(app);
      app.close = async () => {
        // A test may already have quit through the native UI, or close twice in cleanup.
        await app
          .context()
          .tracing.stop({ path })
          .then(
            () => paths.push(path),
            () => undefined,
          );
        await close();
      };
    }
    if (!headless) await verifyHardwareWebGL(await app.firstWindow());
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
