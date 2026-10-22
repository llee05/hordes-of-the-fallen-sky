import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('people work, households and herd reflect growth and losses, and menus freeze their activity', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    (window as any).__gloam.scene.spawnTimer = 999;
  });
  const visible = () =>
    page.evaluate(() => {
      const life = (window as any).__gloam.scene.clanLife;
      return {
        people: life.workers.filter((actor: any) => actor.image.visible).length,
        horses: life.horses.filter((actor: any) => actor.image.visible).length,
      };
    });
  await expect.poll(visible).toEqual({ people: 8, horses: 3 });
  await page.keyboard.press('b');
  await page.locator('[data-node="felt-base"]').click();
  await page.keyboard.press('Escape');
  const before = await page.evaluate(
    () => (window as any).__gloam.scene.clanLife.workers[0].image.x,
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.clanLife.workers[0].image.x))
    .not.toBe(before);
  await page.keyboard.press('j');
  const snapshot = () =>
    page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return [...scene.clanLife.workers, ...scene.clanLife.horses].map((actor: any) => [
        actor.image.x,
        actor.image.y,
        actor.image.frame.name,
        actor.image.alpha,
      ]);
    });
  const paused = await snapshot();
  await page.waitForTimeout(250);
  expect(await snapshot()).toEqual(paused);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.population = 24;
    scene.run.clan.herd = 7;
  });
  await expect.poll(visible).toEqual({ people: 24, horses: 7 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__gloam.scene.camp.list.filter(
            (child: any) => child.getData?.('household') === true,
          ).length,
      ),
    )
    .toBe(4);
  await page.screenshot({ path: 'test-results/living-camp.png' });
  await page.evaluate(() => {
    const run = (window as any).__gloam.scene.run;
    run.clan.population = 3;
    run.clan.herd = 1;
  });
  await expect.poll(visible).toEqual({ people: 3, horses: 1 });
  expect(errors).toEqual([]);
});

test('packing begins immediately, pauses with the world, and arrival relocates the same bounded actors', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.spawnTimer = 999;
    scene.run.clan.stageTime = 45;
  });
  await page.keyboard.press('m');
  await page.locator('[data-route="refuge"]').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.packedGers.length))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.clan.stage)).toBe('migration');
  await page.keyboard.press('Escape');
  const remaining = await page.evaluate(() => (window as any).__gloam.scene.packingRemaining);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__gloam.scene.packingRemaining)).toBe(remaining);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/packing-caravan.png' });
  await page.evaluate(() => {
    (window as any).__gloam.scene.run.clan.stageTime = 100;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__gloam.scene.run.clan.region))
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return scene.clanLife.workers
          .filter((a: any) => a.image.visible)
          .every((a: any) => Math.abs(a.image.x - scene.camp.x) < 300);
      }),
    )
    .toBe(true);
  expect(await page.evaluate(() => (window as any).__gloam.scene.packedGers.length)).toBe(0);
});
