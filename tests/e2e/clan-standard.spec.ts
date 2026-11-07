import { expect, test } from '@playwright/test';
import {
  CHARACTER_BANNER_EMBLEMS,
  CHARACTER_BANNER_TRIMS,
} from '../../src/shared/characterProfile';
import { closeOverlayOrPause, expectFrozen, openTitle, startExpedition } from './helpers';

test('profile banner layers retain every emblem and trim through pause, refresh and migration', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    for (const enemy of s.enemies.getChildren()) enemy.disableBody(true, true);
  });
  for (const [index, emblem] of CHARACTER_BANNER_EMBLEMS.entries()) {
    const trim = CHARACTER_BANNER_TRIMS[index]!;
    const sample = await page.evaluate(
      ({ emblem, trim }) => {
        const s = (window as any).__gloam.scene;
        s.run.character.banner = { emblem, trim, fieldColour: 'lapis' };
        s.campPresenter.refresh();
        const standard = s.camp.list.find((child: any) => child.name === 'banner');
        return standard.list.map((layer: any) => ({
          name: layer.name,
          frame: layer.frame.name,
          texture: layer.texture.key,
          tint: layer.tintTopLeft,
        }));
      },
      { emblem, trim },
    );
    expect(sample).toEqual([
      {
        name: 'banner-pole',
        frame: 'banner-pole',
        texture: 'steppe-classes-motion',
        tint: 0xffffff,
      },
      {
        name: 'banner-field',
        frame: 'banner-field',
        texture: 'steppe-classes-motion',
        tint: 0x2e4d73,
      },
      {
        name: 'banner-trim',
        frame: `banner-trim-${trim}`,
        texture: 'steppe-classes-motion',
        tint: 0xd9aa4c,
      },
      {
        name: 'banner-emblem',
        frame: `banner-emblem-${emblem}`,
        texture: 'steppe-classes-motion',
        tint: 0xd9aa4c,
      },
    ]);
  }
  await closeOverlayOrPause(page);
  await expectFrozen(page, () =>
    page.evaluate(() => {
      const standard = (window as any).__gloam.scene.camp.list.find(
        (child: any) => child.name === 'banner',
      );
      return {
        angle: standard.angle,
        scaleX: standard.scaleX,
        frames: standard.list.map((layer: any) => layer.frame.name),
      };
    }),
  );
  const migrated = await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.run.clan.stage = 'migration';
    s.run.clan.migrationProgress = 0.25;
    s.campPresenter.refresh();
    s.campPresenter.update(0);
    const standard = s.camp.list.find((child: any) => child.name === 'banner');
    return {
      campX: s.camp.x,
      emblem: standard.getByName('banner-emblem').frame.name,
      trim: standard.getByName('banner-trim').frame.name,
    };
  });
  expect(migrated).toEqual({
    campX: 2887.5,
    emblem: 'banner-emblem-knot',
    trim: 'banner-trim-lattice-band',
  });
});
