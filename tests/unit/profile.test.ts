import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfileStore } from '../../desktop/profile';
import { captureCampArchive } from '../../src/game/state/campArchive';
import { createRun } from '../../src/game/state/run';
import { defaultProfile, isProfile, normalizeProfile } from '../../src/shared/profile';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
async function store(): Promise<ProfileStore> {
  const directory = await mkdtemp(join(tmpdir(), 'gloam-profile-'));
  directories.push(directory);
  return new ProfileStore(directory);
}

describe('native save files', () => {
  it('round-trips bounded command recall without changing score or sound settings', async () => {
    const profiles = await store();
    await profiles.save({
      version: 1,
      bestSeconds: 77,
      muted: true,
      developerCommandHistory: ['god on', 'status'],
    });
    expect(await profiles.load()).toEqual({
      version: 1,
      bestSeconds: 77,
      muted: true,
      developerCommandHistory: ['god on', 'status'],
    });
    for (const developerCommandHistory of [
      'status',
      Array(41).fill('status'),
      ['x'.repeat(201)],
      ['status\nheal'],
      [42],
    ])
      await expect(
        profiles.save({ version: 1, bestSeconds: 77, muted: true, developerCommandHistory }),
      ).rejects.toThrow('Invalid player profile');
    expect(
      normalizeProfile({ version: 1, bestSeconds: 77, muted: true, developerCommandHistory: 42 }),
    ).toEqual({ version: 1, bestSeconds: 77, muted: true });
  });
  it('atomically round-trips portable camp records and rejects a damaged camp without losing the last save', async () => {
    const profiles = await store();
    const camp = captureCampArchive(createRun());
    await profiles.save({ version: 1, bestSeconds: 77, muted: true, camp });
    expect(await profiles.load()).toEqual({ version: 1, bestSeconds: 77, muted: true, camp });
    await expect(
      profiles.save({ version: 1, bestSeconds: 77, muted: true, camp: { ...camp, tier: 99 } }),
    ).rejects.toThrow('Invalid player profile');
    expect((await profiles.load()).camp).toEqual(camp);
  });

  it('starts clean when no save exists and round-trips a profile', async () => {
    const profiles = await store();
    expect(await profiles.load()).toEqual(defaultProfile());
    await profiles.save({ version: 1, bestSeconds: 77, muted: true });
    expect(await profiles.load()).toEqual({ version: 1, bestSeconds: 77, muted: true });
  });

  it('serializes concurrent writes and atomically leaves the latest complete profile', async () => {
    const profiles = await store();
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        profiles.save({ version: 1, bestSeconds: index, muted: index % 2 === 1 }),
      ),
    );
    await profiles.flush();
    expect(JSON.parse(await readFile(profiles.file, 'utf8'))).toEqual({
      version: 1,
      bestSeconds: 19,
      muted: true,
    });
  });

  it('recovers from malformed saves but rejects invalid IPC input', async () => {
    const profiles = await store();
    await writeFile(profiles.file, '{incomplete');
    expect(await profiles.load()).toEqual(defaultProfile());
    await expect(profiles.save({ version: 1, bestSeconds: -5, muted: false })).rejects.toThrow(
      'Invalid player profile',
    );
    expect(isProfile({ version: 1, bestSeconds: Infinity, muted: false })).toBe(false);
    expect(normalizeProfile({ version: 99 })).toEqual(defaultProfile());
  });
});
