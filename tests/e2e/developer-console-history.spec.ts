import { expect, test } from '@playwright/test';
import { command } from './developerConsole';

test.beforeEach(() => test.setTimeout(90000));
// No state is shared between tests, including saved commands.
test.describe.configure({ mode: 'parallel' });

test('console history, validation, focus, and narrow layouts work without changing title or intro state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.keyboard.press('F10');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await expect(input).toBeFocused();
  await expect(page.getByRole('button', { name: 'Khan invincibility: Off' })).toBeDisabled();
  await command(page, 'god on');
  await expect(page.getByRole('log')).toContainText('Start an expedition');
  await command(page, 'help');
  await expect(page.getByRole('log')).toContainText('Alias: god');
  await command(page, '<img src=x onerror=alert(1)>');
  await expect(page.getByRole('log')).toContainText('Unknown command: <img');
  await expect(page.getByRole('log').locator('img')).toHaveCount(0);
  await input.fill('draft');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('<img src=x onerror=alert(1)>');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('draft');
  expect(
    await page
      .locator('.developer-overlay')
      .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/developer-console-mobile.png' });
  await command(page, 'clear');
  await expect(page.getByRole('log')).toBeEmpty();
  await input.press('ArrowUp');
  await expect(input).toHaveValue('clear');
  await page.keyboard.press('F10');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.keyboard.press('F10');
  await command(page, 'god on');
  await expect(page.getByRole('log')).toContainText('Start an expedition');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('F10');
  await command(page, 'status');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A vow that broke the world.' })).toBeVisible();
});

test('Up recalls saved commands after reload and checkpoints, while Down restores the draft', async ({
  page,
}) => {
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeFocused();
  await page.keyboard.press('Backquote');
  await command(page, 'status');
  await command(page, 'help');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').developerCommandHistory,
      ),
    )
    .toEqual(['status', 'help']);
  await page.reload();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.keyboard.press('Backquote');
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill('unfinished');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('status');
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(input).toHaveValue('unfinished');
  await page.keyboard.press('Backquote');
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('Backquote');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('help');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('status');
});
