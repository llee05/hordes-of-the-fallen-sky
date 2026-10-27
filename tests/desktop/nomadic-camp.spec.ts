import { launchElectron, electronEnvironment } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defaultProfile } from '../../src/shared/profile';

test.use({ trace: 'off' });
test('nomadic camp migrates a native checkpoint, persists new choices and levels, and fits both desktop sizes', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-nomadic-camp-'));
  const environment: Record<string, string> = { ...electronEnvironment() };
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.GLOAM_DEV_SERVER_URL;
  const profile = {
    ...defaultProfile(),
    camp: {
      version: 1,
      tier: 2,
      slots: ['ger', 'archery', null, null, null, null],
      buildings: ['ger', 'archery'],
      paths: { ger: ['level-2'], archery: ['level-2'] },
      internals: {},
      supplies: { food: 70, materials: 300, spirit: 100, population: 8, herd: 3, integrity: 100 },
    },
  };
  await mkdir(join(directory, 'saves'), { recursive: true });
  await writeFile(join(directory, 'saves/profile.json'), JSON.stringify(profile));
  const launch = () =>
    launchElectron({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env: environment,
    });
  let app = await launch();
  const sizeWindow = async (width: number, height: number) => {
    await app.evaluate(
      ({ BrowserWindow }, size) => {
        const w = BrowserWindow.getAllWindows()[0]!;
        w.setResizable(false);
        w.setContentSize(size.width, size.height);
      },
      { width, height },
    );
    await expect
      .poll(() =>
        app
          .firstWindow()
          .then((p) => p.evaluate(() => ({ width: innerWidth, height: innerHeight }))),
      )
      .toEqual({ width, height });
  };
  try {
    let page = await app.firstWindow();
    await sizeWindow(1280, 800);
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: 'Continue clan camp', exact: true }).click();
    await page.keyboard.press('b');
    await expect(page.locator('.camp-map-cores button')).toHaveCount(5);
    await expect(page.locator('[data-camp-slot]')).toHaveCount(4);
    await expect(page.locator('[data-camp-site="khans-ger"]')).toHaveAttribute('data-level', '2');
    await expect(page.locator('[data-camp-site="archery-range"]')).toHaveAttribute(
      'data-level',
      '2',
    );
    await page.locator('[data-camp-slot="1"]').click();
    await page.locator('[data-nomadic-site="healers-ger"]').click();
    await page.locator('.tree-purchase').click();
    await page.locator('.tree-purchase').click();
    await expect
      .poll(async () => {
        try {
          return JSON.parse(
            await readFile(join(directory, 'saves/profile.json'), 'utf8'),
          ).camp?.nomadicCamp?.slots.find((s: any) => s?.id === 'healers-ger')?.level;
        } catch {
          return undefined;
        }
      })
      .toBe(2);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
    await page.getByRole('button', { name: 'Camp scenes: On' }).click();
    await page.getByRole('button', { name: 'Continue clan camp', exact: true }).click();
    await page.keyboard.press('b');
    for (const size of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
    ]) {
      await sizeWindow(size.width, size.height);
      await expect(page.locator('[data-camp-site="healers-ger"]')).toHaveAttribute(
        'data-level',
        '2',
      );
      await page.locator('[data-camp-site="healers-ger"]').click();
      await expect(page.locator('.camp-popup')).toContainText('Building level 2 / 3');
      await expect(page.locator('.tree-purchase')).toBeDisabled();
      const bounds = (await page.locator('.camp-popup').boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(size.width + 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(size.height + 1);
      await page.screenshot({ path: `test-results/native-nomadic-camp-${size.width}.png` });
      await page.locator('[data-camp-dismiss]').click();
    }
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
