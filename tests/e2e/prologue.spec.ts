import { expect, test } from '@playwright/test';
import { openTitle, startExpedition } from './helpers';

test('new journeys cross Arrival and open only the Orkhon road from Karakorum', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);

  await expect(page.locator('#location')).toHaveText('I · ARRIVAL IN KARAKORUM');
  await expect(page.locator('#objective')).toContainText('Ride to the western gate');
  await expect(page.locator('#game-hud')).toHaveClass(/prologue-unestablished/);
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        location: scene.run.clan.locationId,
        stage: scene.run.prologue?.stage,
        marker: scene.prologueDirector.markerPoint(),
      };
    }),
  ).toMatchObject({ location: 'karakorum', stage: 'arrival', marker: { x: expect.any(Number) } });

  await page.evaluate(async () => {
    const { karakorumWorldSite } = (await import(
      // @ts-expect-error -- served by Vite inside page.evaluate, not resolved by Node.
      '/src/game/data/karakorum.ts'
    )) as typeof import('../../src/game/data/karakorum');
    const scene = (window as any).__gloam.scene;
    const visit = (site: Parameters<typeof karakorumWorldSite>[0], seconds: number) => {
      const point = karakorumWorldSite(site);
      scene.player.body.reset(point.x, point.y);
      window.__gloam.hooks.advance(seconds);
    };
    visit('gate', 0.1);
    visit('gate', 1.6);
    visit('yard', 0.1);
    visit('campSite', 0.1);
  });

  await expect(page.locator('#game-hud')).not.toHaveClass(/prologue-unestablished/);
  await expect(page.locator('#clan-message')).toContainText('Blue Banner camp is established');
  expect(await page.evaluate(() => (window as any).__gloam.scene.run.prologue)).toMatchObject({
    campEstablished: true,
    routesOpened: true,
    completed: true,
  });

  await page.keyboard.press('m');
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'route');
  await expect(page.locator('[data-destination]')).toHaveCount(1);
  await expect(page.locator('[data-destination="orkhon-valley"]')).toBeVisible();
});
