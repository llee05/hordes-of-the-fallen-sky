import { launchElectron, electronEnvironment } from '../support/electron';
import { expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

test('native developer history survives app restart without restoring cheat flags', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-command-history-'));
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const env: Record<string, string> = {
    ...electronEnvironment(),
    GLOAM_DEV_SERVER_URL: server.resolvedUrls!.local[0]!,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const launch = () =>
    launchElectron({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env,
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    await page.getByRole('button', { name: 'Developer mode F8' }).click();
    await page.locator('[data-developer-level="chapter:golden-pasture"]').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.keyboard.press('Backquote');
    let input = page.getByRole('textbox', { name: 'Command', exact: true });
    for (const line of ['god on', 'clan-invincible on', 'status']) {
      await input.fill(line);
      await input.press('Enter');
    }
    await expect
      .poll(
        async () =>
          JSON.parse(await readFile(join(directory, 'saves/profile.json'), 'utf8'))
            .developerCommandHistory,
      )
      .toEqual(['god on', 'clan-invincible on', 'status']);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await expect(page.getByRole('button', { name: /NEW GAME/ })).toBeVisible();
    await page.keyboard.press('Backquote');
    input = page.getByRole('textbox', { name: 'Command', exact: true });
    await input.press('ArrowUp');
    await expect(input).toHaveValue('status');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('clan-invincible on');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('god on');
    expect(
      await page.evaluate(() => {
        const tools = (window as any).__gloam.scene.developerTools;
        return { khan: tools.invincible, clan: tools.clanInvincible };
      }),
    ).toEqual({ khan: false, clan: false });
    expect(await page.evaluate(() => typeof (window as any).require)).toBe('undefined');
  } finally {
    await app.close();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});
