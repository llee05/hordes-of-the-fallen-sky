import { launchElectron } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('desktop starting traditions and combat settings fit a compact window and persist through native saves', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-gameplay-upgrades-'));
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.GLOAM_DEV_SERVER_URL;
  const app = await launchElectron({
    ...(process.env.GLOAM_TEST_EXECUTABLE
      ? {
          executablePath: process.env.GLOAM_TEST_EXECUTABLE,
          args: [`--user-data-dir=${directory}`],
        }
      : { args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`] }),
    env,
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setContentSize(800, 600),
    );
    await page.getByRole('button', { name: 'Starting tradition: Shared hearth' }).click();
    await page.locator('[data-starting-tradition="hearthkeepers"]').click();
    await expect(page.locator('[data-starting-tradition="hearthkeepers"]')).toBeFocused();
    await expect(page.locator('[data-starting-tradition="hearthkeepers"]')).toBeInViewport({
      ratio: 0.8,
    });
    expect(
      await page.locator('.starting-traditions').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/native-starting-traditions.png' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Projectile contrast', exact: true }).click();
    await page.getByRole('button', { name: 'Effect density', exact: true }).click();
    await page.getByRole('button', { name: 'Effect density', exact: true }).click();
    expect(
      await page.locator('.utility-panel').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/native-combat-settings.png' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Skip intro/ }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
    await page.getByRole('button', { name: 'Save to Slot 1' }).click();
    await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
    const save = JSON.parse(
      await readFile(join(directory, 'saves/expedition-slot-1.json'), 'utf8'),
    );
    expect(save.run.startingTradition).toBe('hearthkeepers');
    expect(save.run.metrics.stages).toHaveLength(1);
    const profile = JSON.parse(await readFile(join(directory, 'saves/profile.json'), 'utf8'));
    expect(profile.visualSettings).toEqual({
      projectileContrast: 'high',
      effectDensity: 'minimal',
    });
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
  } finally {
    await app.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});
