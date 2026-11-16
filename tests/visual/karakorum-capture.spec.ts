import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { CameraOptions } from '../../src/game/dev/gameControls';

// Repeatable Karakorum placeholder captures for visual diagnosis (not a regression test:
// nothing is compared). Run only when browser capture is explicitly approved.
const at = (x: number, y: number) => ({ x: 4352 + x, y: 4352 + y });

interface Shot {
  name: string;
  camera: CameraOptions;
}

const SHOTS: Shot[] = [
  { name: '01-western-gate', camera: { ...at(1050, -520), zoom: 1 } },
  { name: '02-training-yard', camera: { ...at(2050, 210), zoom: 1 } },
  { name: '03-west-track', camera: { ...at(-900, 40), zoom: 1 } },
];

interface World3D {
  setResolution(mode: 'auto' | 'full'): void;
}

const OUTPUT = process.env.VISUAL_OUTPUT_DIR || join('test-results', 'visual', 'karakorum');

test.setTimeout(120_000);
test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('blur', (event) => event.stopImmediatePropagation(), true);
  });
  await page.goto('/');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
  await page.waitForFunction(() => !!window.__gloam?.hooks);
});

async function capture(page: Page, shot: Shot): Promise<void> {
  const state = await page.evaluate(async (camera) => {
    const { hooks, scene } = window.__gloam;
    await hooks.loadScenario({ place: 'karakorum', seed: 1 });
    const world = (scene as unknown as { landscape: { world3d?: World3D } }).landscape.world3d;
    world?.setResolution('full');
    hooks.freezeVisuals(true);
    hooks.setCamera(camera);
    await hooks.captureScene({ timeout: 60_000 });
    return hooks.getState();
  }, shot.camera);
  expect(state.place.id).toBe('karakorum');
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
