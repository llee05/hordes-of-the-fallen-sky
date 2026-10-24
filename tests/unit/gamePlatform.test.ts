import { afterEach, describe, expect, it, vi } from 'vitest';
import { GamePlatform } from '../../src/platform/GamePlatform';
import { defaultProfile, type PlayerProfile } from '../../src/shared/profile';
import type { DesktopBridge } from '../../src/shared/desktop';

afterEach(() => vi.unstubAllGlobals());

describe('platform command-history persistence', () => {
  it('serializes copied history snapshots with score and settings through the native bridge', async () => {
    const writes: PlayerProfile[] = [];
    const bridge: DesktopBridge = {
      loadProfile: async () => defaultProfile(),
      saveProfile: async (profile) => {
        writes.push(profile);
      },
      toggleFullscreen: async () => false,
      isFullscreen: async () => false,
      quit: async () => undefined,
      onFullscreenChanged: () => () => undefined,
    };
    vi.stubGlobal('window', { desktop: bridge });
    const platform = await GamePlatform.create();
    const history = ['status'];
    const first = platform.saveDeveloperCommandHistory(history);
    history.push('heal');
    await Promise.all([
      first,
      platform.saveMuted(true),
      platform.saveBest(77),
      platform.saveDeveloperCommandHistory(history),
    ]);
    expect(writes[0]).toEqual({ ...defaultProfile(), developerCommandHistory: ['status'] });
    expect(writes.at(-1)).toEqual({
      version: 1,
      bestSeconds: 77,
      muted: true,
      developerCommandHistory: ['status', 'heal'],
    });
  });

  it('restores browser history through the preview profile and tolerates write failures', async () => {
    const storage = new Map<string, string>([
      [
        'gloam-profile',
        JSON.stringify({
          version: 1,
          bestSeconds: 88,
          muted: true,
          developerCommandHistory: ['help', 'status'],
        }),
      ],
    ]);
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const platform = await GamePlatform.create();
    expect(platform.profile.developerCommandHistory).toEqual(['help', 'status']);
    await platform.saveDeveloperCommandHistory(['status', 'god on']);
    expect(JSON.parse(storage.get('gloam-profile')!).bestSeconds).toBe(88);
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('unavailable');
      },
    });
    await expect(platform.saveDeveloperCommandHistory(['help'])).rejects.toThrow('unavailable');
    expect(platform.profile.developerCommandHistory).toEqual(['help']);
  });
});
