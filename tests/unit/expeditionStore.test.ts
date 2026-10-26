import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfileStore } from '../../desktop/profile';
import { GamePlatform } from '../../src/platform/GamePlatform';
import { captureExpedition } from '../../src/game/state/expeditionArchive';
import { createRun } from '../../src/game/state/run';
import { world } from './fixtures/expedition';
import { isExpeditionSave, isSaveData, type ExpeditionSave } from '../../src/shared/expeditionSave';

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
function fixture(elapsed = 30): ExpeditionSave {
  const run = createRun();
  run.elapsed = elapsed;
  return captureExpedition(run, world());
}
async function store() {
  const directory = await mkdtemp(join(tmpdir(), 'gloam-expedition-'));
  directories.push(directory);
  return { directory, profiles: new ProfileStore(directory) };
}
it('queues immutable native saves separately from profiles and recovers a truncated primary', async () => {
  const { directory, profiles } = await store();
  const save = fixture();
  const first = profiles.saveExpedition('slot-1', save);
  save.run.elapsed = 99;
  await first;
  expect((await profiles.loadExpedition('slot-1')).run.elapsed).toBe(30);
  await Promise.all([
    profiles.saveExpedition('slot-1', fixture(40)),
    profiles.saveExpedition('slot-1', fixture(50)),
  ]);
  expect((await profiles.loadExpedition('slot-1')).summary.elapsed).toBe(50);
  await writeFile(join(directory, 'expedition-slot-1.json'), '{interrupted');
  expect((await profiles.listExpeditions())[0]?.status).toBe('recovered');
  expect((await profiles.loadExpedition('slot-1')).summary.elapsed).toBe(40);
  await profiles.saveExpedition('slot-1', fixture(60));
  expect(
    JSON.parse(await readFile(join(directory, 'expedition-slot-1.json.bak'), 'utf8')).summary
      .elapsed,
  ).toBe(40);
  await profiles.deleteExpedition('slot-1');
  expect(await profiles.listExpeditions()).toEqual([]);
});
it('rejects path capabilities, unsafe values, oversized data and unsupported versions', async () => {
  const { directory, profiles } = await store();
  expect(() => profiles.saveExpedition('../outside' as 'auto', fixture())).toThrow(
    'Invalid save slot',
  );
  for (const invalid of [
    { ...fixture(), version: 9 },
    { ...fixture(), run: { health: Infinity } },
    { ...fixture(), run: { text: 'x'.repeat(9000) } },
  ])
    await expect(profiles.saveExpedition('auto', invalid)).rejects.toThrow(
      'Invalid expedition save',
    );
  expect(isSaveData(JSON.parse('{"__proto__":{}}'))).toBe(false);
  expect(isExpeditionSave(fixture())).toBe(true);
  await profiles.saveExpedition('auto', fixture());
  await profiles.saveExpedition('auto', fixture());
  await writeFile(join(directory, 'expedition-auto.json'), '{"version":99}');
  expect(await profiles.listExpeditions()).toEqual([{ slot: 'auto', status: 'incompatible' }]);
  await expect(profiles.loadExpedition('auto')).rejects.toThrow('unsupported version');
});
it('round-trips browser preview slots and backup recovery without mixing profile preferences', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const platform = await GamePlatform.create();
  await platform.saveMuted(true);
  await platform.saveExpedition('auto', fixture(12));
  await platform.saveExpedition('auto', fixture(24));
  values.set('gloam-expedition-auto', 'broken');
  const reopened = await GamePlatform.create();
  expect(reopened.profile.muted).toBe(true);
  expect(reopened.saves[0]?.status).toBe('recovered');
  expect((await reopened.loadExpedition('auto')).summary.elapsed).toBe(12);
  await reopened.deleteExpedition('auto');
  expect(reopened.saves).toEqual([]);
});
