import { expect, test } from '@playwright/test';
import { DEVELOPER_LEVELS } from '../../src/game/dev/levels';
import { closeOverlayOrPause, expectFrozen } from './helpers';

// Tests use isolated browser contexts; parallel mode also balances CI shards.
test.describe.configure({ mode: 'parallel' });

test(
  'developer mode freezes the expedition and returns to the exact title or menu',
  { tag: '@core' },
  async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await expect(page.locator('[data-developer-level]')).toHaveCount(DEVELOPER_LEVELS.length);
    await expect(page.getByRole('button', { name: 'Back ESC / F8' })).toBeFocused();
    await expectFrozen(
      page,
      () => page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run)),
      13,
    );
    await closeOverlayOrPause(page);
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
    await page.getByRole('button', { name: /NEW GAME/ }).click();
    await page.getByRole('button', { name: /Begin Journey/ }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.keyboard.press('F8');
    await expect(page.getByRole('heading', { name: 'Developer mode' })).toBeVisible();
    // Native auto-repeat and Phaser replay must not toggle the menu a second time.
    await page.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F8', keyCode: 119, repeat: true, bubbles: true }),
      ),
    );
    await expect(page.getByRole('heading', { name: 'Developer mode' })).toBeVisible();
    await page.keyboard.press('F8');
    await expect(page.getByRole('dialog')).toBeHidden();
    await closeOverlayOrPause(page);
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await closeOverlayOrPause(page);
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
    await closeOverlayOrPause(page);
    await page.keyboard.press('b');
    await page.locator('[data-tree-search]').fill('bow');
    await page.keyboard.press('F8');
    await expect(page.getByRole('heading', { name: 'Developer mode' })).toBeVisible();
    await closeOverlayOrPause(page);
    await expect(page.getByRole('heading', { name: "The Khan's camp", exact: true })).toBeVisible();
    await expect(page.locator('[data-tree-search]')).toHaveValue('bow');
    await page.locator('[data-action="exit-camp"]').first().click();
    await closeOverlayOrPause(page);
    await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  },
);

test('switching checkpoints clears old actors, hazards, and succession', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="place:khan-tengri"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const warning = scene.add.graphics();
    scene.hazards.push({ x: scene.player.x + 500, y: scene.player.y, remaining: 10, warning });
    const gem = scene.gems.get(scene.player.x + 500, scene.player.y, 'gem');
    gem.enableBody(true, scene.player.x + 500, scene.player.y, true, true);
    gem.value = 100;
    scene.run.xp = 3;
    window.__gloam.hooks.setTimers({ invulnerable: 0 });
    scene.takeDamage(1000);
    (window as any).oldDeveloperWorld = { gem, warning, enemies: scene.enemies };
  });
  await expect(page.locator('#khan-succession')).toBeVisible();
  await page.keyboard.press('F8');
  await expectFrozen(
    page,
    () =>
      page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return {
          run: JSON.stringify(scene.run),
          frames: scene.playerMotion.frame,
          x: scene.camp.x,
        };
      }),
    13,
  );
  await page.locator('[data-developer-level="place:otgontenger"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      const old = (window as any).oldDeveloperWorld;
      return {
        destroyed: [old.gem, old.warning].every((actor) => !actor.scene),
        newPool: scene.enemies !== old.enemies,
        hazards: scene.hazards.length,
        succession: scene.run.khan.successionRemaining,
        bodyEnabled: scene.player.body.enable,
        generation: scene.run.khan.generation,
      };
    }),
  ).toEqual({
    destroyed: true,
    newPool: true,
    hazards: 0,
    succession: 0,
    bodyEnabled: true,
    generation: 1,
  });
});

test('developer outcomes leave saved records intact and a normal new game clears developer mode', async ({
  page,
}) => {
  await page.goto('/');
  const saved = await page.evaluate(() => ({
    profile: localStorage.getItem('gloam-profile'),
    best: localStorage.getItem('gloam-best'),
  }));
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="place:altai-tavan-bogd"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.integrity = 0;
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('— — : — —');
  await page.keyboard.press('F8');
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  expect(
    await page.evaluate(() => ({
      profile: localStorage.getItem('gloam-profile'),
      best: localStorage.getItem('gloam-best'),
    })),
  ).toEqual(saved);
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.getByRole('button', { name: /Begin Journey/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        developer: scene.developerRun,
        population: scene.run.clan.population,
        locationId: scene.run.clan.locationId,
      };
    }),
  ).toEqual({ developer: false, population: 8, locationId: 'otgontenger' });
});

test('developer choices and Back stay usable in a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await expect(page.getByRole('heading', { name: 'Developer mode' })).toBeVisible();
  expect(
    await page
      .locator('.developer-panel')
      .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
  ).toBe(true);
  await page.locator('[data-developer-level="place:orkhon-valley"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/developer-mobile.png' });
  await page.locator('[data-developer-level="place:orkhon-valley"]').click();
  await expect(page.locator('#location')).toHaveText('ORKHON VALLEY');
});

test('developer mode starts expeditions as non-default playable classes with distinct loadouts and painted sprites', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await expect(page.locator('[data-developer-class]')).toHaveCount(4);

  await page.locator('[data-developer-class="lancer"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#weapon-label')).toHaveText('LANCE');
  await expect(page.locator('#power')).toHaveText('24');
  await expect(page.locator('#health')).toHaveText('120 / 120');
  await expect(page.locator('#khan-title')).toHaveAttribute('data-character-class', 'lancer');

  const lancerState = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      phase: scene.run.phase,
      classId: scene.run.character.classId,
      texture: scene.player.texture.key,
      frame: scene.player.frame.name,
      pierce: scene.run.stats.pierce,
    };
  });
  expect(lancerState).toMatchObject({
    phase: 'playing',
    classId: 'lancer',
    texture: 'steppe-classes-motion',
    pierce: 2,
  });

  expect(lancerState.frame).toMatch(/^lancer-(move|attack)-\d$/);

  await page.keyboard.press('F8');
  await page.locator('[data-developer-class="spirit-caller"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#weapon-label')).toHaveText('STAFF');
  await expect(page.locator('#power')).toHaveText('14');
  await expect(page.locator('#health')).toHaveText('95 / 95');
  await expect(page.locator('#khan-title')).toHaveAttribute(
    'data-character-class',
    'spirit-caller',
  );

  const callerState = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return {
      phase: scene.run.phase,
      classId: scene.run.character.classId,
      texture: scene.player.texture.key,
      frame: scene.player.frame.name,
      projectiles: scene.run.stats.projectiles,
      pickupRadius: scene.run.stats.pickupRadius,
    };
  });
  expect(callerState).toMatchObject({
    phase: 'playing',
    classId: 'spirit-caller',
    texture: 'steppe-classes-motion',
    projectiles: 2,
    pickupRadius: 110,
  });
  expect(callerState.frame).toMatch(/^spirit-caller-(move|attack)-\d$/);
});
