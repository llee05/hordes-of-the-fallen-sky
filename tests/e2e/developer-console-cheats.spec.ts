import { expect, test } from '@playwright/test';
import { command } from './developerConsole';

test.beforeEach(() => test.setTimeout(90000));
// No state is shared between tests, including saved commands.
test.describe.configure({ mode: 'parallel' });

test('using cheats marks a normal run, preserves records, carries between checkpoints, and resets on New Game', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').bestSeconds ?? 0,
  );
  await page.keyboard.press('Backquote');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'console');
  await expect(page.locator('.developer-panel')).toHaveCount(0);
  await command(page, 'clan-invincible on');
  expect(await page.evaluate(() => (window as any).__gloam.scene.developerRun)).toBe(true);
  await command(page, 'god on');
  expect(await page.evaluate(() => (window as any).__gloam.scene.developerRun)).toBe(true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.elapsed = 321;
    scene.run.clan.integrity = 0;
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').bestSeconds ?? 0,
    ),
  ).toBe(saved);
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#developer-run')).toContainText('INVINCIBLE');
  await page.keyboard.press('F10');
  await command(page, 'status');
  await expect(page.getByRole('log')).toContainText('Khan invincibility: ON');
  await expect(page.getByRole('log')).toContainText('Clan invincibility: ON');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start a new run' }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        developer: scene.developerRun,
        invincible: scene.developerTools.invincible,
        clanInvincible: scene.developerTools.clanInvincible,
        history: scene.developerTools.history,
      };
    }),
  ).toEqual({
    developer: false,
    invincible: false,
    clanInvincible: false,
    history: ['clan-invincible on', 'god on', 'status'],
  });
});
