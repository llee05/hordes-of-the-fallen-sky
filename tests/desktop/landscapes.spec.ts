import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { GAME } from '../../src/game/config';

test('painted landscapes and destination previews remain readable in Electron', async () => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-landscapes-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const environment = { ...process.env, GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]! };
  delete environment.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
    for (const size of [
      { width: 1280, height: 800 },
      { width: 960, height: 600 },
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0]!.setContentSize(size.width, size.height),
        size,
      );
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(size.width);
      for (const id of [
        'eej-khairkhan',
        'otgontenger',
        'belukha',
        'bogd-khan-uul',
        'altai-tavan-bogd',
        'khan-tengri',
        'altan-ovoo',
        'orkhon-valley',
        'golden-pasture',
        'silent-river',
      ] as const) {
        await page.keyboard.press('F8');
        const checkpoint = ['golden-pasture', 'silent-river'].includes(id)
          ? `chapter:${id}`
          : `destination:2:${id}`;
        await page.locator(`[data-developer-level="${checkpoint}"]`).click();
        await expect(page.getByRole('dialog')).toBeHidden();
        expect(
          await page.evaluate(() => {
            const scene = (window as any).__gloam.scene;
            return scene.textures.get('steppe-scenery').getFrameNames().length;
          }),
        ).toBe(12);
        const tile = LANDSCAPES[id].groundTile;
        expect(
          await page.evaluate(() => {
            const scene = (window as any).__gloam.scene;
            const ground = scene.landscape.ground;
            const previous = (window as any).nativeGround;
            (window as any).nativeGround = ground;
            return {
              texture: ground.displayTexture.key,
              scale: [ground.tileScaleX, ground.tileScaleY],
              bounds: [ground.x, ground.y, ground.width, ground.height],
              physical: Boolean(ground.body),
              oldDestroyed: !previous || !previous.scene,
              groundSprites: scene.children.list.filter((item: any) => item.type === 'TileSprite')
                .length,
              tiles: scene.textures
                .getTextureKeys()
                .filter((key: string) => key.startsWith('ground-')).length,
            };
          }),
        ).toEqual({
          texture: tile ? `ground-${tile}` : 'ground',
          scale: [0.65, 0.65],
          bounds: [0, 0, GAME.worldSize, GAME.worldSize],
          physical: false,
          oldDestroyed: true,
          groundSprites: 1,
          tiles: 8,
        });
        await page.evaluate(() => {
          const scene = (window as any).__gloam.scene;
          if (!scene.landscape.definition.water) return;
          scene.cameras.main.stopFollow().centerOn(scene.camp.x, scene.camp.y - 240);
          scene.player.setPosition(scene.camp.x, scene.camp.y - 150);
        });
        await page.screenshot({ path: `test-results/landscapes/native-${id}-${size.width}.png` });
      }
      await page.keyboard.press('m');
      await page.locator('[data-destination="belukha"]').click();
      await expect(page.locator('#destination-detail [data-landscape="belukha"]')).toBeVisible();
      expect(
        await page
          .locator('.route-dialog')
          .evaluate((panel) => panel.scrollWidth <= panel.clientWidth),
      ).toBe(true);
      await page.screenshot({ path: `test-results/landscapes/native-previews-${size.width}.png` });
      await page.keyboard.press('Escape');
    }
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
