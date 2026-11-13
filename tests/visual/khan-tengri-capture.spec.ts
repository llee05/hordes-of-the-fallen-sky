import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { CameraOptions } from '../../src/game/dev/gameControls';

// Repeatable Khan Tengri terrain captures for visual diagnosis (not a regression test: nothing is
// compared). Run only when browser capture is explicitly approved. Every view uses the seeded
// checkpoint, normal camera angle, full resolution, frozen simulation, and hidden HUD.

const at = (x: number, y: number) => ({ x: 4400 + x, y: 4400 + y });

interface Shot {
  name: string;
  camera: CameraOptions;
  angle?: number;
}

const SHOTS: Shot[] = [
  { name: '01-camp-and-moraine-loop', camera: { ...at(-2050, 1050), zoom: 1 } },
  { name: '02-western-ramp', camera: { ...at(-1660, -460), zoom: 1 } },
  { name: '03-marble-pyramid-view', camera: { ...at(-450, -1300), zoom: 1 } },
  { name: '04-blue-ice-margin', camera: { ...at(2100, -100), zoom: 1 } },
  { name: '05-erratic-field-and-meltwater', camera: { ...at(1500, 1050), zoom: 1 } },
  { name: '06-overview-zoom60', camera: { ...at(0, 0), zoom: 0.6 } },
  { name: '07-grazing-angle', camera: { ...at(-300, -700), zoom: 1 }, angle: 35 },
];

interface World3D {
  setAngle(angle: number): void;
  setResolution(mode: 'auto' | 'full'): void;
}

const OUTPUT = process.env.VISUAL_OUTPUT_DIR || join('test-results', 'visual', 'khan-tengri');

test.setTimeout(120_000);

test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('blur', (event) => event.stopImmediatePropagation(), true);
  });
  await page.goto('/?khanTengriPaintedGround=1');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
  await page.waitForFunction(() => !!window.__gloam?.hooks);
});

async function capture(page: Page, shot: Shot): Promise<void> {
  const state = await page.evaluate(
    async ({ camera, angle }) => {
      const { hooks, scene } = window.__gloam;
      await hooks.loadScenario({ place: 'khan-tengri', seed: 1 });
      const world = (scene as unknown as { landscape: { world3d?: World3D } }).landscape.world3d;
      world?.setResolution('full');
      if (angle !== undefined) world?.setAngle(angle);
      hooks.freezeVisuals(true);
      hooks.setCamera(camera);
      await hooks.captureScene({ timeout: 60_000 });
      return hooks.getState();
    },
    { camera: shot.camera, angle: shot.angle },
  );
  expect(state.place.id).toBe('khan-tengri');
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
