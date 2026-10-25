import { expect, it, vi, afterEach } from 'vitest';
import { isProfile, normalizeProfile } from '../../src/shared/profile';
import { normalizeVisualSettings, effectAmount } from '../../src/shared/visualSettings';
import { GamePlatform } from '../../src/platform/GamePlatform';
afterEach(() => vi.unstubAllGlobals());
it('keeps legacy settings neutral and rejects unsupported visual settings without dropping other preferences', () => {
  expect(normalizeVisualSettings(undefined)).toEqual({
    projectileContrast: 'standard',
    effectDensity: 'full',
  });
  const profile = {
    version: 1,
    bestSeconds: 55,
    muted: true,
    visualSettings: { projectileContrast: 'bad', effectDensity: 'none' },
  };
  expect(isProfile(profile)).toBe(false);
  expect(normalizeProfile(profile)).toMatchObject({
    bestSeconds: 55,
    muted: true,
    visualSettings: { projectileContrast: 'standard', effectDensity: 'full' },
  });
  expect(effectAmount({ projectileContrast: 'high', effectDensity: 'minimal' })).toBe(0);
});
it('queues independent native preference snapshots without storing visual settings in an expedition', async () => {
  const writes: unknown[] = [];
  vi.stubGlobal('window', {
    desktop: {
      loadProfile: async () => ({ version: 1, bestSeconds: 55, muted: false }),
      listExpeditions: async () => [],
      saveProfile: async (p: unknown) => {
        writes.push(p);
      },
    },
  });
  const platform = await GamePlatform.create();
  const settings = { projectileContrast: 'high', effectDensity: 'reduced' } as const;
  await platform.saveVisualSettings(settings);
  await platform.saveMuted(true);
  expect(writes[0]).toMatchObject({ muted: false, visualSettings: settings });
  expect(writes[1]).toMatchObject({ muted: true, visualSettings: settings });
});
