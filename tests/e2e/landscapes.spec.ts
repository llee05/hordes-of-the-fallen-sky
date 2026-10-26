import { expect, test } from '@playwright/test';
import { LOCATIONS } from '../../src/game/data/clan';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { sceneFrames } from './helpers';

// Readback filmstrips add substantial work to software-rendered terrain frames.
test.use({ trace: 'off' });

// These checks inspect Phaser ground/prop objects, exclusive to the 2D compatibility renderer.

test('all twelve landscapes render bundled scenery, replace old props, and freeze in menus', async ({
  page,
}) => {
  // Budget each of the twelve scene rebuilds independently of local GPU speed.
  test.setTimeout(LOCATIONS.length * 30000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?terrain=2d');
  await expect(page.getByRole('button', { name: 'Developer mode F8' })).toBeVisible();
  for (const place of LOCATIONS) {
    await page.keyboard.press('F8');
    const checkpoint = place.context ? `destination:3:${place.id}` : `chapter:${place.id}`;
    await page.locator(`[data-developer-level="${checkpoint}"]`).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    const expected = LANDSCAPES[place.id];
    await expect
      .poll(() =>
        page.evaluate(() => {
          const scene = (window as any).__gloam.scene;
          const landscape = scene.landscape;
          const all = [...landscape.props, ...landscape.regional.list];
          return {
            name: landscape.regional.name,
            title: landscape.definition.title,
            ground: landscape.ground.displayTexture.key,
            groundWash: landscape.groundWash.fillAlpha,
            water:
              landscape.regional.list.find((item: any) => item.name.startsWith('water-'))?.name ??
              null,
            missing: all.filter((item: any) => item.texture && item.texture.key === '__MISSING')
              .length,
            physical: landscape.props.filter((item: any) => item.body).length,
            oldDestroyed: ((window as any).oldScenery ?? []).every((item: any) => !item.scene),
          };
        }),
      )
      .toEqual({
        name: `landscape-${place.id}`,
        title: expected.title,
        ground: expected.groundTile ? `ground-${expected.groundTile}` : 'ground',
        groundWash: expected.groundTile ? 0 : expected.wash,
        water: expected.water ? `water-${expected.water.kind}` : null,
        missing: 0,
        physical: 0,
        oldDestroyed: true,
      });
    await page.screenshot({ path: `test-results/landscapes/${place.id}.png` });
    await page.keyboard.press('Escape');
    await expect(page.locator('#app')).toHaveAttribute('data-phase', 'paused');
    const frozen = await page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      (window as any).oldScenery = [...scene.landscape.props, ...scene.landscape.regional.list];
      return {
        elapsed: scene.run.elapsed,
        weather: [...scene.landscape.atmosphere.commandBuffer],
        wind: [...scene.landscape.wind.commandBuffer],
      };
    });
    await sceneFrames(page);
    expect(
      await page.evaluate(() => {
        const scene = (window as any).__gloam.scene;
        return {
          elapsed: scene.run.elapsed,
          weather: [...scene.landscape.atmosphere.commandBuffer],
          wind: [...scene.landscape.wind.commandBuffer],
        };
      }),
    ).toEqual(frozen);
  }
  expect(errors).toEqual([]);
});

test('landscape identity survives chapter weather and revisiting does not accumulate objects', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/?terrain=2d');
  await page.getByRole('button', { name: 'Developer mode F8' }).click();
  await page.locator('[data-developer-level="destination:2:eej-khairkhan"]').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#location')).toHaveText('EEJ KHAIRKHAN');
  const read = () =>
    page.evaluate(() => {
      const scene = (window as any).__gloam.scene;
      return {
        title: scene.landscape.definition.title,
        surface: scene.landscape.definition.surface,
        props: scene.landscape.props.length,
        ground: scene.landscape.groundWash.fillColor,
        objects: scene.children.length,
      };
    });
  const first = await read();
  for (const chapter of [3, 2, 3, 2]) {
    await page.keyboard.press('F8');
    await page.locator(`[data-developer-level="destination:${chapter}:eej-khairkhan"]`).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await read()).toEqual(first);
  }
  // Chapter 2 has onward named destinations; chapter 3 only offers the final refuge.
  await page.keyboard.press('m');
  await page.locator('[data-destination="orkhon-valley"]').click();
  await expect(page.locator('#destination-detail [data-landscape="orkhon-valley"]')).toBeVisible();
  await expect(page.locator('#destination-detail')).toContainText(
    LANDSCAPES['orkhon-valley'].description,
  );
  await page.screenshot({ path: 'test-results/landscapes/destination-previews.png' });
});
