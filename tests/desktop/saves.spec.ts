import { launchElectron, electronEnvironment } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('native expeditions survive a real window close, relaunch paused, and keep manual slots independent', async () => {
  test.setTimeout(100000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-full-saves-'));
  const env: Record<string, string> = { ...electronEnvironment() };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.GLOAM_DEV_SERVER_URL;
  const launch = () =>
    launchElectron({
      ...(process.env.GLOAM_TEST_EXECUTABLE
        ? {
            executablePath: process.env.GLOAM_TEST_EXECUTABLE,
            args: [`--user-data-dir=${directory}`],
          }
        : { args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`] }),
      env,
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save to Slot 1' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save to Slot 1' }).click();
    await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
    const manualFile = join(directory, 'saves/expedition-slot-1.json');
    const manual = JSON.parse(await readFile(manualFile, 'utf8'));
    expect(manual.run.clan.estate.tier).toBe(1);
    expect(
      await page.evaluate(async () => {
        try {
          await (window as any).desktop.loadExpedition('../outside');
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/native-save-menu.png' });
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
    await expect(page.locator('#timer')).not.toHaveText('00:00');
    let closed = app.waitForEvent('close');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close());
    await closed;
    const autosave = JSON.parse(
      await readFile(join(directory, 'saves/expedition-auto.json'), 'utf8'),
    );
    expect(autosave.run.elapsed).toBeGreaterThan(manual.run.elapsed);
    expect(JSON.parse(await readFile(manualFile, 'utf8'))).toEqual(manual);
    app = await launch();
    page = await app.firstWindow();
    await page.getByRole('button', { name: /CONTINUE EXPEDITION/ }).click();
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    const frozen = await page.locator('#timer').textContent();
    await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
    await expect(page.locator('[data-save-slot="auto"]')).toContainText('The Golden Pasture');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('#timer')).toHaveText(frozen!);
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
    closed = app.waitForEvent('close');
    await page.getByRole('button', { name: 'Quit game', exact: true }).click();
    await closed;
  } finally {
    await app.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
