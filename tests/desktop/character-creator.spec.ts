import { expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launchElectron, electronEnvironment } from '../support/electron';

test('native character creation fits 1280x800 and persists the selected character through the bridge', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gloam-character-creator-'));
  const env = electronEnvironment();
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.GLOAM_DEV_SERVER_URL;
  const app = await launchElectron({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env,
  });
  try {
    const page = await app.firstWindow();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setContentSize(1280, 800),
    );
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByRole('heading', { name: 'Character Creation' })).toBeVisible();
    await expect(page.getByLabel('Name', { exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: /Begin Journey/ })).toBeInViewport();
    expect(
      await page.locator('.character-creator').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.getByRole('radio', { name: 'Iron Pagoda' }).click();
    await expect(page.locator('.creator-right')).toContainText('Armoured bulwark');
    await page.getByLabel('Name', { exact: true }).fill('Mandukhai');
    await page.getByRole('button', { name: /Begin Journey/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect
      .poll(
        async () =>
          JSON.parse(await readFile(join(directory, 'saves/profile.json'), 'utf8')).character,
      )
      .toMatchObject({ name: 'Mandukhai', classId: 'iron-pagoda' });
    await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
    await page.getByRole('button', { name: 'Save to Slot 1' }).click();
    await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
    const saved = JSON.parse(
      await readFile(join(directory, 'saves/expedition-slot-1.json'), 'utf8'),
    );
    expect(saved.run.character).toMatchObject({
      name: 'Mandukhai',
      classId: 'iron-pagoda',
      gender: 'woman',
    });
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
