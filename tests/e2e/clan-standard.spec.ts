import { expect, test } from '@playwright/test';
import {
  CHARACTER_BANNER_EMBLEMS,
  CHARACTER_BANNER_TRIMS,
} from '../../src/shared/characterProfile';
import { closeOverlayOrPause, expectFrozen, openTitle, startExpedition } from './helpers';

test('profile standards cache one painted sprite through pause, refresh and migration', async ({
  page,
}) => {
  await openTitle(page);
  await startExpedition(page);
  await page.evaluate(() => {
    const s = (window as any).__gloam.scene;
    s.spawnTimer = s.attackTimer = 999;
    for (const enemy of s.enemies.getChildren()) enemy.disableBody(true, true);
    s.testBannerPaints = 0;
    s.events.on('painted-atlas-changed', () => s.testBannerPaints++);
  });
  const pixels = new Set<number>();
  for (const [index, emblem] of CHARACTER_BANNER_EMBLEMS.entries()) {
    const trim = CHARACTER_BANNER_TRIMS[index]!;
    const sample = await page.evaluate(
      ({ emblem, trim }) => {
        const s = (window as any).__gloam.scene;
        s.run.character.banner = { emblem, trim, fieldColour: 'lapis' };
        s.campPresenter.refresh();
        const standard = s.camp.list.find((child: any) => child.name === 'banner');
        const appearance = standard.getData('appearance');
        const data = standard.texture.context.getImageData(0, 1120, 128, 180).data;
        let digest = 2166136261;
        for (const value of data) digest = Math.imul(digest ^ value, 16777619) >>> 0;
        const sample = {
          frame: standard.frame.name,
          texture: standard.texture.key,
          appearance,
          digest,
          oneSprite: !standard.list,
        };
        // Ordinary camp refresh with identical choices must not paint or upload again.
        s.campPresenter.refresh();
        return { ...sample, paints: s.testBannerPaints };
      },
      { emblem, trim },
    );
    expect(sample).toMatchObject({
      frame: 'banner-composite',
      texture: 'steppe-classes-motion',
      appearance: {
        emblemFrame: `banner-emblem-${emblem}`,
        trimFrame: `banner-trim-${trim}`,
        fieldTint: 0x2e4d73,
        ornamentTint: 0xd9aa4c,
      },
      paints: index + 1,
      oneSprite: true,
    });
    pixels.add(sample.digest);
  }
  expect(pixels.size).toBe(5);
  await closeOverlayOrPause(page);
  await expectFrozen(page, () =>
    page.evaluate(() => {
      const s = (window as any).__gloam.scene;
      const standard = s.camp.list.find((child: any) => child.name === 'banner');
      return {
        angle: standard.angle,
        scaleX: standard.scaleX,
        frame: standard.frame.name,
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
      emblem: standard.getData('appearance').emblemFrame,
      trim: standard.getData('appearance').trimFrame,
      paints: s.testBannerPaints,
    };
  });
  expect(migrated).toEqual({
    campX: 2887.5,
    emblem: 'banner-emblem-knot',
    trim: 'banner-trim-lattice-band',
    paints: 5,
  });
});
