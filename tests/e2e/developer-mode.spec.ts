import { closeOverlayOrPause } from './helpers';
import { buyNode } from '../e2e/helpers';
import { expect, test } from '@playwright/test';
import { DEVELOPER_LEVELS } from '../../src/game/dev/levels';

// Tests use isolated browser contexts; parallel mode also balances CI shards.
test.describe.configure({ mode: 'parallel' });

test('developer mode freezes the expedition and returns to the exact title, intro, story, or menu', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await expect(page.locator('[data-developer-level]')).toHaveCount(DEVELOPER_LEVELS.length);
  await expect(page.getByRole('button', { name: 'Back ESC / F8' })).toBeFocused();
  const frozen = await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => JSON.stringify((window as any).__gloam.scene.run))).toBe(frozen);
  await closeOverlayOrPause(page);
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await page.keyboard.press('ArrowRight');
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
  await expect(page.getByRole('heading', { name: 'A vow that broke the world.' })).toBeVisible();
  await page.getByRole('button', { name: /Skip intro/ }).click();
  await expect(page.locator('.story-panel')).toBeVisible();
  const encounter = await page.locator('#overlay-title').textContent();
  await page.keyboard.press('F8');
  await closeOverlayOrPause(page);
  await expect(page.locator('#overlay-title')).toHaveText(encounter!);
  await closeOverlayOrPause(page);
  await expect(page.getByRole('dialog')).toBeHidden();
  await closeOverlayOrPause(page);
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  await page.getByRole('button', { name: 'Patron tech tree', exact: true }).click();
  await page.locator('[data-tree-search]').fill('bow');
  await page.keyboard.press('F8');
  await expect(page.getByRole('heading', { name: 'Developer mode' })).toBeVisible();
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'Patron tech tree', exact: true })).toBeVisible();
  await expect(page.locator('[data-tree-search]')).toHaveValue('bow');
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
});

test('switching checkpoints clears old actors, hazards, boss state, succession, and research', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="chapter:heart-of-the-steppe"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 20;
  });
  await expect(page.locator('#boss-bar')).toBeVisible();
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const warning = scene.add.graphics();
    scene.hazards.push({ x: scene.player.x + 500, y: scene.player.y, remaining: 10, warning });
    const gem = scene.gems.get(scene.player.x + 500, scene.player.y, 'gem');
    gem.enableBody(true, scene.player.x + 500, scene.player.y, true, true);
    gem.value = 100;
    scene.run.pendingUpgrades = 3;
    scene.invulnerable = 0;
    scene.takeDamage(1000);
    (window as any).oldDeveloperWorld = { boss: scene.boss, gem, warning, enemies: scene.enemies };
  });
  await expect(page.locator('#khan-succession')).toBeVisible();
  await page.keyboard.press('F8');
  const before = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    return { run: JSON.stringify(scene.run), frames: scene.playerMotion.frame, x: scene.camp.x };
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return { run: JSON.stringify(scene.run), frames: scene.playerMotion.frame, x: scene.camp.x };
    }),
  ).toEqual(before);
  await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      const old = (window as any).oldDeveloperWorld;
      return {
        destroyed: [old.boss, old.gem, old.warning].every((actor) => !actor.scene),
        newPool: scene.enemies !== old.enemies,
        hazards: scene.hazards.length,
        boss: !!scene.boss,
        succession: scene.run.khan.successionRemaining,
        bodyEnabled: scene.player.body.enable,
        knowledge: scene.run.pendingUpgrades,
        generation: scene.run.khan.generation,
      };
    }),
  ).toEqual({
    destroyed: true,
    newPool: true,
    hazards: 0,
    boss: false,
    succession: 0,
    bodyEnabled: true,
    knowledge: 40,
    generation: 1,
  });
  await expect(page.locator('#boss-bar')).toBeHidden();
  await page.keyboard.press('t');
  await buyNode(page, 'power');
  await expect(page.locator('#research-points')).toHaveText('39');
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
  await page.locator('[data-developer-level="chapter:heart-of-the-steppe"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 180;
  });
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  await expect(page.locator('#best')).toHaveText('— — : — —');
  await page.keyboard.press('F8');
  await closeOverlayOrPause(page);
  await expect(page.getByRole('heading', { name: 'A sky worth saving.' })).toBeVisible();
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="chapter:broken-pass"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.integrity = 0;
  });
  await expect(page.getByRole('heading', { name: 'The banners fall.' })).toBeVisible();
  expect(
    await page.evaluate(() => ({
      profile: localStorage.getItem('gloam-profile'),
      best: localStorage.getItem('gloam-best'),
    })),
  ).toEqual(saved);
  await page.getByRole('button', { name: /RAISE THE BANNERS AGAIN/ }).click();
  await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Camp scenes: On' })).toBeVisible();
  await page.getByRole('button', { name: /NEW GAME/ }).click();
  await expect(page.getByRole('heading', { name: 'Beneath Eternal Heaven.' })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        developer: scene.developerRun,
        population: scene.run.clan.population,
        knowledge: scene.run.pendingUpgrades,
        region: scene.run.clan.region,
      };
    }),
  ).toEqual({ developer: false, population: 8, knowledge: 0, region: 0 });
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
  await page
    .locator('[data-developer-level="destination:3:orkhon-valley"]')
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/developer-mobile.png' });
  await page.locator('[data-developer-level="destination:3:orkhon-valley"]').click();
  await expect(page.locator('#location')).toHaveText('ORKHON VALLEY');
});
