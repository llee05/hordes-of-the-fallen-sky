import { expect, test } from '@playwright/test';

test('production loads all local artwork under the Pages subpath without desktop capabilities', async ({
  page,
}) => {
  const errors: string[] = [];
  const failures: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  page.on('requestfailed', (request) => failures.push(request.url()));
  page.on('response', (response) => {
    if (!response.ok()) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('./');
  // Allow a cold software-rendered load to finish before checking title focus.
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Quit game', exact: true })).toHaveCount(0);
  await page.keyboard.press('F10');
  await page.keyboard.press('Backquote');
  await expect(page.locator('[data-developer-command-input]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  expect(
    await page.evaluate(() => ({
      inspection: typeof (window as any).__gloam,
      desktop: typeof (window as any).desktop,
      node: typeof (window as any).require,
    })),
  ).toEqual({ inspection: 'undefined', desktop: 'undefined', node: 'undefined' });
  await page.getByRole('button', { name: 'Replay introduction' }).click();
  for (const heading of [
    'Beneath Eternal Heaven.',
    'A vow that broke the world.',
    'The unreturned ride.',
    'Keep the hearth alive.',
    'A road beneath the sky.',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect
      .poll(() =>
        page.locator('.intro-painting').evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(1536);
    if (heading !== 'A road beneath the sky.') await page.keyboard.press('ArrowRight');
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 16px "DM Sans"'))).toBe(true);
  const root = new URL('./', page.url());
  const urls = requests.filter((url) => /^https?:/.test(url)).map((url) => new URL(url));
  expect(urls.length).toBeGreaterThan(10);
  expect(
    urls.every((url) => url.origin === root.origin && url.pathname.startsWith(root.pathname)),
  ).toBe(true);
  for (const asset of [
    'steppe-ground.png',
    'altai-tavan-bogd.png',
    'altan-ovoo.png',
    'bogd-khan-uul.png',
    'khan-tengri.png',
    'orkhon-valley.png',
    'mount-otgontenger.png',
    'mount-belukha.png',
    'eej-khairkhan.png',
    'steppe-mounted-motion.png',
    'steppe-clan-motion.png',
    'steppe-creature-motion.png',
    'steppe-props.png',
    'ui-felt.png',
  ]) {
    expect(
      urls.some((url) => url.pathname.endsWith(`/art/${asset}`)),
      asset,
    ).toBe(true);
  }
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

test('@gameplay browser expedition builds, pauses, resumes, and retains its profile after reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./?terrain=2d');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('gloam-profile')!).muted))
    .toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unmute sound', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.getByRole('heading', { name: 'A place beside the fire.' })).toBeVisible();
  await page.getByRole('button', { name: /Share the work/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('b');
  await page.locator('[data-camp-slot="1"]').click();
  await page.locator('[data-camp-site="archery"]').click();
  await page.locator('.tree-purchase').click();
  const timer = await page.locator('#timer').textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator('#timer')).toHaveText(timer!);
  await page.keyboard.press('Escape');
  await expect(page.locator('.camp-popup')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#riders')).toHaveText('4');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'playing');
  // Active time caps each simulation step at 50 ms. Software rendering on CI
  // can need more than five wall-clock seconds to display a full gameplay second.
  await expect(page.locator('#timer')).not.toHaveText(timer!, { timeout: 15000 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const paused = await page.locator('#timer').textContent();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.locator('#timer')).toHaveText(paused!);
  expect(errors).toEqual([]);
});

test('@gameplay a compact browser can start and build when local storage is unavailable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 960, height: 600 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is disabled', 'SecurityError');
      },
    });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await page.keyboard.press('b');
  await expect(page.locator('[data-camp-site="ger"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/pages/compact-camp.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(errors).toEqual([]);
});
