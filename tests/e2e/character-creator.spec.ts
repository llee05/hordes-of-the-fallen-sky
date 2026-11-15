import { expect, test } from '@playwright/test';
import { classDefinition } from '../../src/game/data/classes';
import { defaultCharacterProfile } from '../../src/shared/characterProfile';
import { expectFrozen, openTitle } from './helpers';

test.beforeEach(() => test.setTimeout(90000));

test.use({ viewport: { width: 1280, height: 800 } });

test('creator content fits the manuscript folio at every supported size', async ({ page }) => {
  await openTitle(page);
  await page.getByRole('button', { name: /NEW GAME/ }).click();

  const sizes = [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ];
  const classes = ['Mounted Archer', 'Lancer', 'Iron Pagoda', 'Spirit Caller'];

  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const className of classes) {
      await page.getByRole('radio', { name: className, exact: true }).click();
      const fit = await page.locator('.creator-scroll-surface').evaluate((scroll) => {
        const heading = scroll.querySelector('.creator-heading')!.getBoundingClientRect();
        const classes = scroll.querySelector('.creator-class-section')!.getBoundingClientRect();
        const actions = scroll.querySelector('.creator-actions')!.getBoundingClientRect();
        const portrait = scroll.querySelector('.creator-portrait-stage')!.getBoundingClientRect();
        const bounds = scroll.getBoundingClientRect();
        return {
          horizontal: scroll.scrollWidth <= scroll.clientWidth + 1,
          vertical: scroll.scrollHeight <= scroll.clientHeight + 1,
          controlsInsidePaper:
            heading.top > bounds.top + bounds.height * 0.01 &&
            classes.left > bounds.left + bounds.width * 0.01 &&
            classes.right < bounds.right - bounds.width * 0.01 &&
            actions.bottom < bounds.bottom - bounds.height * 0.01,
          portraitInsidePaper:
            portrait.top > bounds.top + bounds.height * 0.03 &&
            portrait.bottom < bounds.bottom - bounds.height * 0.025,
        };
      });
      expect(fit, `${className} at ${size.width}x${size.height}`).toEqual({
        horizontal: true,
        vertical: true,
        controlsInsidePaper: true,
        portraitInsidePaper: true,
      });
    }
  }
});

test(
  'creator starts the selected class and remembers the last profile',
  { tag: '@core' },
  async ({ page }) => {
    await openTitle(page);
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByRole('heading', { name: 'Character Creation' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Gender' }).getByRole('radio')).toHaveCount(
      2,
    );
    await expect(
      page.getByRole('radiogroup', { name: 'Combat class' }).getByRole('radio'),
    ).toHaveCount(4);
    await expect(
      page.getByRole('radiogroup', { name: 'Gender' }).locator('[tabindex="0"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole('radiogroup', { name: 'Combat class' }).locator('[tabindex="0"]'),
    ).toHaveCount(1);
    await expectFrozen(page, () => page.evaluate(() => (window as any).__gloam.scene.run.elapsed));

    await page.getByRole('radio', { name: 'Male' }).click();
    await page.getByRole('radio', { name: 'Lancer' }).click();
    await expect(page.locator('.creator-class-description')).toContainText(
      classDefinition('lancer').summary,
    );
    await expect(page.locator('[data-creator-ability]')).toHaveCount(0);
    await expect(page.locator('[data-creator-portrait]')).toHaveAttribute('data-class', 'lancer');
    await expect(page.locator('[data-creator-portrait]')).toHaveAttribute('data-gender', 'man');
    await expect(page.locator('.creator-portrait-outgoing')).toHaveCount(1);

    const begin = page.getByRole('button', { name: 'Begin Journey', exact: true });
    await page.getByLabel('Name', { exact: true }).fill('');
    await expect(begin).toHaveAttribute('aria-disabled', 'true');
    await begin.click();
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Random name', exact: true }).click();
    await expect(page.getByLabel('Name', { exact: true })).not.toHaveValue('');
    await page.getByLabel('Name', { exact: true }).fill('Jebe');
    await begin.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.keyboard.press('Escape');

    const character = await page.evaluate(() => (window as any).__gloam.scene.run.character);
    expect(character).toEqual({
      ...defaultCharacterProfile(),
      name: 'Jebe',
      gender: 'man',
      classId: 'lancer',
    });
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem('gloam-profile') ?? '{}').character),
      )
      .toEqual(character);

    await page.reload();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Jebe');
    await expect(page.getByRole('radio', { name: 'Lancer' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      await page.evaluate(() => (window as any).__gloam.scene.characterCreator.profile),
    ).toEqual(character);
  },
);

test('creator supports keyboard focus, Back, and frozen gameplay time', async ({ page }) => {
  await openTitle(page);
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Altani');
  expect(
    await page.locator('.character-creator').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);

  await page.getByRole('radio', { name: 'Spirit Caller' }).click();
  await expect(page.locator('.creator-class-description')).toContainText(
    classDefinition('spirit-caller').summary,
  );
  await page.getByRole('button', { name: 'Begin Journey', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back to title', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();

  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expectFrozen(page, () => page.evaluate(() => (window as any).__gloam.scene.run.elapsed));
  await expect(page.getByRole('radio', { name: 'Spirit Caller' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByLabel('Name', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Female' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Mounted Archer' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Lancer' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Iron Pagoda' })).toBeFocused();
  await page.getByLabel('Name', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Begin Journey', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Begin Journey', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.character.classId)).toBe(
    'spirit-caller',
  );
});
