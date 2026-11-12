import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { CameraOptions } from '../../src/game/dev/gameControls';

// Repeatable Orkhon Valley terrain captures for diagnosing art and rendering (not a regression
// test: nothing is compared). Run with `npm run visual:orkhon`; see docs/visual-workflow.md.
// Every scene loads the same seeded checkpoint, centres a fixed camera, freezes the scene,
// locks the 3D resolution at 100%, hides the HUD and waits for terrain before the screenshot.

/** Level-centre-relative points in data/orkhonValley.ts become world points around 3200. */
const at = (x: number, y: number) => ({ x: 3200 + x, y: 3200 + y });

interface Shot {
  name: string;
  camera: CameraOptions;
  /** Camera elevation in degrees (the game uses 48; the debug range is 35–70). */
  angle?: number;
}

const SHOTS: Shot[] = [
  // The camp clearing and its connected tracks on the open central steppe.
  { name: '01-valley-ground', camera: { ...at(-550, 420), zoom: 1 } },
  // The spirit-height ramp in the north-west: cliff, rim and worn approach.
  { name: '02-plateau-edge-ramp', camera: { ...at(-1850, -1195), zoom: 1 } },
  { name: '03-ramp-closeup', camera: { ...at(-1850, -1195), zoom: 1.6 } },
  // The eastern crossing: river painting, bank bands and bridge deck.
  { name: '04-river-bank-bridge', camera: { ...at(520, -1050), zoom: 1 } },
  // The foot of the large eastern falls and the head of the gorge.
  { name: '05-falls', camera: { ...at(2250, -300), zoom: 1 } },
  // The widest view the game allows across all four painted quadrants.
  { name: '06-overview-zoom60', camera: { ...at(0, 0), zoom: 0.6 } },
  // A low camera across the valley toward the falls plateau: anisotropic and mip sampling.
  { name: '07-grazing-angle', camera: { ...at(-550, 100), zoom: 1 }, angle: 35 },
];

/** Development-only renderer controls: the console's camera-angle command and Settings > 3D resolution. */
interface World3D {
  setAngle(angle: number): void;
  setResolution(mode: 'auto' | 'full'): void;
}

const OUTPUT = process.env.VISUAL_OUTPUT_DIR || join('test-results', 'visual', 'orkhon');
const PAINTED_GROUND = process.env.ORKHON_PAINTED_GROUND === '1';

test.setTimeout(120_000);

test.beforeAll(() => mkdirSync(OUTPUT, { recursive: true }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // A focus change must not open the pause menu mid-capture.
    window.addEventListener('blur', (event) => event.stopImmediatePropagation(), true);
  });
  await page.goto(PAINTED_GROUND ? '/?orkhonPaintedGround=1' : '/?orkhonPaintedGround=0');
  await expect(page.locator('canvas[data-world-renderer="3d"]')).toBeVisible();
  await page.waitForFunction(() => !!window.__gloam?.hooks);
});

async function capture(page: Page, shot: Shot): Promise<void> {
  const state = await page.evaluate(
    async ({ camera, angle }) => {
      const { hooks, scene } = window.__gloam;
      await hooks.loadScenario({ place: 'orkhon-valley', seed: 1 });
      // The landscape is private to the scene's type but reachable in development builds.
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
  expect(state.place.id).toBe('orkhon-valley');
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
