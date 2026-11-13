import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { CameraOptions } from '../../src/game/dev/gameControls';

// Repeatable Bogd Khan Uul diagnosis captures, never compared with baselines. Run only with
// explicit browser-capture approval. Views use the normal 48-degree camera and full resolution.
const at = (x: number, y: number) => ({ x: 3200 + x, y: 3200 + y });

const SHOTS: readonly { name: string; camera: CameraOptions }[] = [
  { name: '01-camp-and-main-trail', camera: { ...at(-2050, 50), zoom: 1 } },
  { name: '02-west-ramp-and-shoulder', camera: { ...at(-1275, 1100), zoom: 1 } },
  { name: '03-tuul-bank-and-landing-road', camera: { ...at(-800, -450), zoom: 1 } },
  { name: '04-larch-glade', camera: { ...at(780, 100), zoom: 1 } },
  { name: '05-east-ramp-and-pine-hollow', camera: { ...at(1550, 1150), zoom: 1 } },
];

interface World3D {
  setResolution(mode: 'auto' | 'full'): void;
}

const OUTPUT = process.env.VISUAL_OUTPUT_DIR || join('test-results', 'visual', 'bogd-khan-uul');

test.setTimeout(120_000);
test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('blur', (event) => event.stopImmediatePropagation(), true);
  });
  await page.goto('/?bogdKhanUulPaintedGround=1');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
  await page.waitForFunction(() => !!window.__gloam?.hooks);
});

async function capture(page: Page, name: string, camera: CameraOptions): Promise<void> {
  const state = await page.evaluate(async (shot) => {
    const { hooks, scene } = window.__gloam;
    await hooks.loadScenario({ place: 'bogd-khan-uul', seed: 1 });
    (scene as unknown as { landscape: { world3d?: World3D } }).landscape.world3d?.setResolution(
      'full',
    );
    hooks.freezeVisuals(true);
    hooks.setCamera(shot);
    await hooks.captureScene({ timeout: 60_000 });
    return hooks.getState();
  }, camera);
  expect(state.place.id).toBe('bogd-khan-uul');
  await page.addStyleTag({
    content: '#arena-wrap > :not(#game-canvas) { visibility: hidden !important; }',
  });
  await page.screenshot({ path: join(OUTPUT, `${name}.png`), animations: 'disabled' });
}

for (const shot of SHOTS)
  test(shot.name, async ({ page }) => {
    await capture(page, shot.name, shot.camera);
  });
