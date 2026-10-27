import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('manual saves survive reload and restore the exact paused battle, XP, research and succession', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('gloam-expedition-auto')))
    .toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.elapsed = 123.75;
    s.run.pendingUpgrades = 4;
    s.run.xp = 7;
    s.run.health = 0;
    s.run.khan.successionRemaining = 4.2;
    s.run.khan.candidate = 'hearthguard';
    s.run.patrons.hearth.revives = 0;
    s.hideFallenKhan();
    s.spawnEnemy();
    const enemy = s.enemies.getFirstAlive();
    if (!enemy) throw new Error('Expected a live enemy');
    enemy.health = 3;
    enemy.burning = 1.5;
    enemy.tactics = {
      phase: 'windup',
      remaining: 0.4,
      aim: { x: s.camp.x, y: s.camp.y },
      direction: { x: 1, y: 0 },
    };
    s.shootVolley(s.camp.x, s.camp.y, enemy, 1, 1);
    const bolt = s.projectiles.getFirstAlive();
    bolt.hitTargets.set(enemy, enemy.spawnId);
    const gem = s.gems.get(s.camp.x + 30, s.camp.y + 30, 'gem');
    gem.enableBody(true, gem.x, gem.y, true, true);
    gem.value = 37;
    gem.attracted = true;
    s.dashTimer = 2.8;
    s.invulnerable = 0.4;
    s.patronSupport.restore({ ...s.patronSupport.capture(), waterTimer: 2.2 });
  });
  await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
  await page.getByRole('button', { name: 'Save to Slot 1', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Expedition saved.' })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('gloam-expedition-slot-1')!),
  );
  expect(saved.run.pendingUpgrades).toBe(4);
  expect(saved.world.support.waterTimer).toBe(2.2);
  await page.setViewportSize({ width: 960, height: 600 });
  expect(await page.locator('.save-menu').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/save-menu.png' });
  await page.reload();
  await page.getByRole('button', { name: /CONTINUE EXPEDITION/ }).click();
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const restored = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    return JSON.parse(
      JSON.stringify({
        run: s.run,
        world: s.captureWorld(),
        bodyEnabled: s.player.body.enable,
        canSave: s.canSaveExpedition,
      }),
    );
  });
  expect(restored.run).toEqual(saved.run);
  expect(restored.world).toEqual(saved.world);
  expect(restored.bodyEnabled).toBe(false);
  expect(restored.canSave).toBe(true);
  await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.khan.successionRemaining))
    .toBeLessThan(4.1);
  expect(errors).toEqual([]);
});

test('overwrite and deletion require explicit confirmation and malformed saves leave the current game intact', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save to Slot 1' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save to Slot 1' }).click();
  await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
  await page.getByRole('button', { name: 'Save to Slot 1' }).click();
  await expect(page.getByRole('button', { name: 'Confirm overwrite' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Slot 1' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.locator('[data-save-slot="slot-1"]')).toContainText('Empty slot');
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('gloam-expedition-auto')!);
    delete save.run.stats;
    localStorage.setItem('gloam-expedition-auto', JSON.stringify(save));
  });
  await page.getByRole('button', { name: 'Load Autosave' }).click();
  await page.getByRole('button', { name: 'Confirm load' }).click();
  await expect(page.locator('.save-message')).toContainText('damaged or incompatible');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.phase)).toBe('saves');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
});

test('save and return to title preserves a normal expedition and developer runs cannot overwrite it', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => !(window as any).__gloam.scene.saveBusy)).toBe(true);
  await page.getByRole('button', { name: 'Save and return to title' }).click();
  await expect(page.getByRole('button', { name: /CONTINUE EXPEDITION/ })).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('gloam-expedition-auto'));
  await page.keyboard.press('F8');
  await page.locator('[data-developer-level="destination:2:otgontenger"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
  await expect(page.getByRole('button', { name: /Save to Slot/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('gloam-expedition-auto'))).toBe(before);
});

test('a carved 2.5D migration route and crossing resume with the same terrain and progress', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Camp scenes: On' }).click();
  await startExpedition(page, { legacyCamp: false });
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.clan.stageTime = 45;
    s.openRoutes();
    s.chooseRoute('river', 'otgontenger');
    s.run.clan.migrationProgress = 0.43;
    s.run.clan.stageTime = 22;
    s.run.crossing.phase = 'assault';
    s.run.crossing.spawned = 3;
    s.run.crossing.defeated = 1;
    s.updateCamp(0);
    s.setPhase('paused');
  });
  await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save to Slot 2' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save to Slot 2' }).click();
  await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
  const before = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    return {
      crossing: s.run.crossing,
      clan: s.run.clan,
      camp: { x: s.camp.x, y: s.camp.y },
      terrain: s.landscape.world3d.terrain.region.scene,
      walk: Array.from({ length: 36 }, (_, i) =>
        s.landscape.navigation.isWalkable(2600 + i * 32, 2600, 24, true),
      ),
    };
  });
  await page.reload();
  await page.getByRole('button', { name: /CONTINUE EXPEDITION/ }).click();
  await expect(page.getByRole('heading', { name: 'A quiet moment.' })).toBeVisible();
  const after = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    return {
      crossing: s.run.crossing,
      clan: s.run.clan,
      camp: { x: s.camp.x, y: s.camp.y },
      terrain: s.landscape.world3d.terrain.region.scene,
      walk: Array.from({ length: 36 }, (_, i) =>
        s.landscape.navigation.isWalkable(2600 + i * 32, 2600, 24, true),
      ),
    };
  });
  expect(after).toEqual(before);
  expect(after.walk.every(Boolean)).toBe(true);
});

test('failed writes retain the previous save and leave the expedition playable', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Saved expeditions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save to Slot 1' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save to Slot 1' }).click();
  await expect(page.locator('.save-message')).toHaveText('Expedition saved.');
  const before = await page.evaluate(() => {
    const previous = localStorage.getItem('gloam-expedition-slot-1');
    Storage.prototype.setItem = () => {
      throw new Error('Disk full');
    };
    return previous;
  });
  await page.getByRole('button', { name: 'Save to Slot 1' }).click();
  await page.getByRole('button', { name: 'Confirm overwrite' }).click();
  await expect(page.locator('.save-message')).toContainText('Saving failed');
  expect(await page.evaluate(() => localStorage.getItem('gloam-expedition-slot-1'))).toBe(before);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: /RETURN TO THE STEPPE/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('closing waits for pending and coalesced checkpoints before saving the latest state', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page, { legacyCamp: false });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => !(window as any).__gloam.scene.saveBusy)).toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    const save = s.platform.saveExpedition.bind(s.platform);
    let first = true;
    s.platform.saveExpedition = async (...args: unknown[]) => {
      if (first) {
        first = false;
        await new Promise<void>((resolve) => {
          (window as any).releaseSave = resolve;
        });
      }
      return save(...args);
    };
    void s.saveExpedition();
  });
  await expect.poll(() => page.evaluate(() => !!(window as any).releaseSave)).toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.pendingUpgrades = 9;
    s.requestCheckpoint();
    void s.prepareToClose().then((ready: boolean) => {
      (window as any).closeReady = ready;
    });
    (window as any).releaseSave();
  });
  await expect.poll(() => page.evaluate(() => (window as any).closeReady)).toBe(true);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('gloam-expedition-auto')!).run.pendingUpgrades,
    ),
  ).toBe(9);
});
