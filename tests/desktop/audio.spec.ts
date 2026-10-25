import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import credits from '../../public/audio/credits.json' with { type: 'json' };

test.use({ trace: 'off' });
test('offline recordings decode, reference layers play, and the native channel mix survives restart', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), 'gloam-recorded-audio-'));
  const environment = { ...process.env };
  delete environment.ELECTRON_RUN_AS_NODE;
  delete environment.GLOAM_DEV_SERVER_URL;
  const launch = () =>
    electron.launch({
      args: [resolve('dist-desktop/desktop/main.js'), `--user-data-dir=${directory}`],
      env: environment,
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    expect(page.url()).toMatch(/^file:/);
    expect(await page.evaluate(() => typeof (window as any).__gloam)).toBe('undefined');
    await page.evaluate(() => {
      Object.assign(window, { decodedRecordings: 0, startedRecordings: [] });
      const nativeDecode = AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData = function (bytes: ArrayBuffer) {
        return nativeDecode.call(this, bytes).then((buffer) => {
          (window as any).decodedRecordings++;
          return buffer;
        });
      };
      const nativeSource = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function () {
        const source = nativeSource.call(this),
          start = source.start.bind(source);
        source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
          (window as any).startedRecordings.push({
            duration: source.buffer?.duration,
            rate: source.buffer?.sampleRate,
          });
          start(...args);
        };
        return source;
      };
      AudioContext.prototype.createOscillator = function () {
        throw new Error('Synthetic fallback is forbidden');
      };
    });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).decodedRecordings), { timeout: 15000 })
      .toBe(credits.assets.length);
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0]!;
      w.setResizable(false);
      w.setContentSize(960, 600);
    });
    await expect
      .poll(() => page.evaluate(() => ({ width: innerWidth, height: innerHeight })))
      .toEqual({ width: 960, height: 600 });
    for (const label of ['Combat', 'Ambience', 'Interface'])
      await page.getByRole('slider', { name: `${label} volume`, exact: true }).fill('0');
    await page.getByRole('slider', { name: 'Music volume', exact: true }).fill('15');
    await page.locator('.audio-reference-controls summary').click();
    const before = await page.evaluate(() => (window as any).startedRecordings.length);
    await page.getByRole('button', { name: 'Bow', exact: true }).click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as any).startedRecordings.length)).toBe(before);
    await page.getByRole('slider', { name: 'Combat volume', exact: true }).fill('80');
    await page.getByRole('slider', { name: 'Ambience volume', exact: true }).fill('30');
    await page.getByRole('slider', { name: 'Interface volume', exact: true }).fill('40');
    await page.getByRole('button', { name: 'Bow', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).startedRecordings.length))
      .toBeGreaterThanOrEqual(before + 2);
    const played = await page.evaluate(
      (start) => (window as any).startedRecordings.slice(start),
      before,
    );
    expect(played.some((r: any) => r.duration > 0.2 && r.duration < 0.4)).toBe(true);
    expect(played.every((r: any) => r.rate >= 44100)).toBe(true);
    await page.screenshot({ path: 'test-results/native-recorded-audio-settings.png' });
    await expect
      .poll(
        async () =>
          JSON.parse(await readFile(join(directory, 'saves/profile.json'), 'utf8')).audioMix,
      )
      .toEqual({ music: 0.15, ambience: 0.3, combat: 0.8, ui: 0.4 });
    expect(errors).toEqual([]);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toHaveValue('15');
    await expect(page.getByRole('slider', { name: 'Ambience volume', exact: true })).toHaveValue(
      '30',
    );
    await expect(page.getByRole('slider', { name: 'Combat volume', exact: true })).toHaveValue(
      '80',
    );
    await expect(page.getByRole('slider', { name: 'Interface volume', exact: true })).toHaveValue(
      '40',
    );
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
