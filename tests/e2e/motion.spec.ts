import { expect, test } from '@playwright/test';
import { startExpedition, openTitle } from './helpers';

test.use({ reducedMotion: 'no-preference' });

test('animated menus accept actions immediately and do not replay their entrance on purchase', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  // Exercise input in the same task that creates the entrance, before its first
  // rendered frame. Actions and simulation phases must never wait for motion.
  const result = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.openBuildings();
    const elapsed = scene.run.elapsed;
    const panel = document.querySelector('.game-panel')!;
    const entering = panel.getAnimations().some((animation) => animation.playState === 'running');
    const paused = scene.physics.world.isPaused;
    document.querySelector<HTMLButtonElement>('[data-camp-site="archery"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-node="archery-base"]')!.click();
    document.querySelector<HTMLButtonElement>('.tree-purchase')!.click();
    const refreshed = document.querySelector('.game-panel')!;
    const repeatedEntrance = refreshed.getAnimations().length;
    const built = scene.run.clan.buildings.archery;
    const elapsedAfterPurchase = scene.run.elapsed;
    document.querySelector<HTMLButtonElement>('.panel-close')!.click();
    return {
      entering,
      paused,
      repeatedEntrance,
      built,
      elapsed,
      elapsedAfterPurchase,
      phase: scene.run.phase,
      resumed: !scene.physics.world.isPaused,
      overlayHidden: (document.querySelector('#overlay') as HTMLElement).hidden,
    };
  });
  expect(result).toMatchObject({
    entering: true,
    paused: true,
    repeatedEntrance: 0,
    built: 1,
    phase: 'playing',
    resumed: true,
    overlayHidden: true,
  });
  expect(result.elapsedAfterPurchase).toBe(result.elapsed);
});

test('HUD feedback stays bounded, cancels on pause, and responds to live reduced-motion changes', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  const feedback = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    const value = document.querySelector('#materials')!;
    const initial = Math.floor(scene.run.clan.materials);
    for (let index = 0; index < 8; index++) {
      scene.run.clan.materials += 1;
      scene.cycleFormation(); // Publishes the actual scene-owned HUD snapshot.
    }
    const displayed = Number(value.textContent);
    const running = value.getAnimations().length;
    scene.togglePause();
    return {
      initial,
      displayed,
      running,
      pausedAnimations: value.getAnimations().length,
    };
  });
  expect(feedback.displayed).toBe(feedback.initial + 8);
  expect(feedback.running).toBe(1);
  expect(feedback.pausedAnimations).toBe(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.materials += 5;
    scene.cycleFormation();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      page
        .locator('#app')
        .evaluate(
          (root) =>
            root.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
        ),
    )
    .toBe(0);
  const reduced = await page.evaluate(() => {
    const scene = (window as any).__gloam.scene;
    scene.run.clan.materials += 5;
    scene.cycleFormation();
    scene.openBuildings();
    return {
      displayed: Number(document.querySelector('#materials')!.textContent),
      actual: Math.floor(scene.run.clan.materials),
      animations: document.querySelector('#app')!.getAnimations({ subtree: true }).length,
      paused: scene.physics.world.isPaused,
    };
  });
  expect(reduced.displayed).toBe(reduced.actual);
  expect(reduced.animations).toBe(0);
  expect(reduced.paused).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(
    await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      scene.run.clan.materials += 1;
      scene.cycleFormation();
      return document.querySelector('#materials')!.getAnimations().length;
    }),
  ).toBe(1);
});
