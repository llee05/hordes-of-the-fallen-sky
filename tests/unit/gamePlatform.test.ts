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
      listExpeditions: async () => [],
      loadExpedition: async () => {
        throw new Error('empty');
      },
      saveExpedition: async () => undefined,
      deleteExpedition: async () => undefined,
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

  it('saves independent mix snapshots with native profile data and retains mute separately', async () => {
    const writes: PlayerProfile[] = [];
    vi.stubGlobal('window', {
      desktop: {
        loadProfile: async () => ({ ...defaultProfile(), bestSeconds: 77 }),
        saveProfile: async (profile: PlayerProfile) => {
          writes.push(profile);
        },
      },
    });
    const platform = await GamePlatform.create();
    const mix = { music: 0.2, ambience: 0.3, combat: 0.4, ui: 0.5 };
    const first = platform.saveAudioMix(mix);
    mix.music = 0;
    await Promise.all([first, platform.saveMuted(true), platform.saveAudioMix(mix)]);
    expect(writes[0]?.audioMix?.music).toBe(0.2);
    expect(writes.at(-1)).toMatchObject({
      bestSeconds: 77,
      muted: true,
      audioMix: { music: 0, ambience: 0.3, combat: 0.4, ui: 0.5 },
    });
  });
});
