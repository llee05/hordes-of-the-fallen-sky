import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { CameraOptions } from '../../src/game/dev/gameControls';

// Repeatable Altai Tavan Bogd terrain captures for visual diagnosis (not a regression test:
// nothing is compared). Run only when browser capture is explicitly approved. Every view uses
// the seeded checkpoint, the normal 48-degree camera, full resolution and frozen simulation.
const at = (x: number, y: number) => ({ x: 3200 + x, y: 3200 + y });

interface Shot {
  name: string;
  camera: CameraOptions;
}

const SHOTS: Shot[] = [
  { name: '01-camp-and-valley-loop', camera: { ...at(-1900, 900), zoom: 1 } },
  { name: '02-west-moraine-ramp', camera: { ...at(-1670, -120), zoom: 1 } },
  { name: '03-moraine-and-passes', camera: { ...at(-900, -950), zoom: 0.8 } },
  { name: '04-potanin-overlook', camera: { ...at(300, -950), zoom: 1 } },
  { name: '05-long-lake-shore', camera: { ...at(1250, -100), zoom: 1 } },
  { name: '06-overview-zoom60', camera: { ...at(0, 0), zoom: 0.6 } },
];

interface World3D {
  setResolution(mode: 'auto' | 'full'): void;
}

const OUTPUT = process.env.VISUAL_OUTPUT_DIR || join('test-results', 'visual', 'altai-tavan-bogd');

test.setTimeout(120_000);
test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('blur', (event) => event.stopImmediatePropagation(), true);
  });
  await page.goto('/?altaiTavanBogdPaintedGround=1');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
  await page.waitForFunction(() => !!window.__gloam?.hooks);
});

async function capture(page: Page, shot: Shot): Promise<void> {
  const state = await page.evaluate(async (camera) => {
    const { hooks, scene } = window.__gloam;
    await hooks.loadScenario({ place: 'altai-tavan-bogd', seed: 1 });
    const world = (scene as unknown as { landscape: { world3d?: World3D } }).landscape.world3d;
    world?.setResolution('full');
    hooks.freezeVisuals(true);
    hooks.setCamera(camera);
    await hooks.captureScene({ timeout: 60_000 });
    return hooks.getState();
  }, shot.camera);
  expect(state.place.id).toBe('altai-tavan-bogd');
  expect(state.frozen).toBe(true);
  await page.addStyleTag({
    content: '#arena-wrap > :not(#game-canvas) { visibility: hidden !important; }',
  });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.screenshot({ path: join(OUTPUT, `${shot.name}.png`), animations: 'disabled' });
}

for (const shot of SHOTS)
  test(shot.name, async ({ page }) => {
    await capture(page, shot);
  });
