import { expect, test } from '@playwright/test';
import { classDefinition, backgroundDefinition, oathDefinition } from '../../src/game/data/classes';
import { openTitle, expectFrozen } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

test(
  'creator maps every choice into the expedition and remembers the last profile',
  { tag: '@core' },
  async ({ page }) => {
    await openTitle(page);
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByRole('heading', { name: 'Character Creation' })).toBeVisible();
    await expect(page.locator('[data-creator-field="classId"]')).toHaveCount(4);
    await expect(page.locator('[data-creator-field="face"]')).toHaveCount(0);
    await expectFrozen(page, () => page.evaluate(() => (window as any).__gloam.scene.run.elapsed));
    const choose = (field: string, value: string) =>
      page
        .locator(`.creator-option[data-creator-field="${field}"][data-creator-value="${value}"]`)
        .click();
    await choose('gender', 'man');
    await choose('hairstyle', 'topknot');
    await choose('headgear', 'lamellar-helm');
    await choose('clothingColour', 'vermilion');
    await choose('classId', 'lancer');
    await choose('background', 'artisan');
    await choose('oath', 'oath-of-the-khan');
    await choose('mount', 'piebald');
    await choose('emblem', 'hawk');
    await choose('fieldColour', 'lapis');
    await choose('trim', 'cloud-scroll');
    await expect(page.locator('.creator-class-description')).toContainText(
      classDefinition('lancer').summary,
    );
    await expect(page.locator('.creator-class-description')).toContainText(
      classDefinition('lancer').keyTraits[0],
    );
    await expect(page.locator('.creator-origin')).toContainText(
      backgroundDefinition('artisan').bonusLabel,
    );
    await expect(page.locator('.creator-oath-description')).toContainText(
      oathDefinition('oath-of-the-khan').summary,
    );
    await page.getByLabel('Name', { exact: true }).fill('');
    await expect(page.getByRole('button', { name: /Begin Journey/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Random name', exact: true }).click();
    await expect(page.getByLabel('Name', { exact: true })).not.toHaveValue('');
    await page.getByLabel('Name', { exact: true }).fill('Jebe');
    await page.getByRole('button', { name: /Begin Journey/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.keyboard.press('Escape');
    const character = await page.evaluate(() => (window as any).__gloam.scene.run.character);
    expect(character).toEqual({
      name: 'Jebe',
      gender: 'man',
      hairstyle: 'topknot',
      headgear: 'lamellar-helm',
      clothingColour: 'vermilion',
      background: 'artisan',
      classId: 'lancer',
      oath: 'oath-of-the-khan',
      mount: 'piebald',
      banner: { emblem: 'hawk', fieldColour: 'lapis', trim: 'cloud-scroll' },
    });
    expect(await page.evaluate(() => (window as any).__gloam.scene.run.stats.damage)).toBe(
      classDefinition('lancer').stats.damage +
        (oathDefinition('oath-of-the-khan').statBonuses?.damage ?? 0),
    );
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').character),
      )
      .toEqual(character);
    await page.reload();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Jebe');
    await expect(
      page.locator('[data-creator-field="classId"][data-creator-value="lancer"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(() => (window as any).__gloam.scene.characterCreator.profile),
    ).toEqual(character);
  },
);

test('legacy defaults, narrow touch controls, keyboard focus, and Back preserve paused simulation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTitle(page);
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Altani');
  expect(
    await page.locator('.character-creator').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole('button', { name: 'Next Hairstyle', exact: true }).click();
  await expect(
    page.locator('[data-creator-field="hairstyle"][data-creator-value="topknot"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-creator-field="classId"][data-creator-value="spirit-caller"]').click();
  await expect(page.locator('.creator-class-description')).toContainText(
    classDefinition('spirit-caller').summary,
  );
  await page.getByRole('button', { name: /Begin Journey/ }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back to title', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expectFrozen(page, () => page.evaluate(() => (window as any).__gloam.scene.run.elapsed));
  await expect(
    page.locator('[data-creator-field="classId"][data-creator-value="spirit-caller"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Begin Journey/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.character.classId)).toBe(
    'spirit-caller',
  );
});
