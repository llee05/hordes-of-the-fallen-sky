import { expect, it, vi, afterEach } from 'vitest';
import { isProfile, normalizeProfile } from '../../src/shared/profile';
import { normalizeVisualSettings, effectAmount } from '../../src/shared/visualSettings';
import { GamePlatform } from '../../src/platform/GamePlatform';
import { settingsMenu } from '../../src/ui/menuContent';
afterEach(() => vi.unstubAllGlobals());
it('keeps legacy settings neutral and rejects unsupported visual settings without dropping other preferences', () => {
  expect(normalizeVisualSettings(undefined)).toEqual({
    projectileContrast: 'standard',
    effectDensity: 'full',
    renderResolution: 'auto',
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
  expect(
    effectAmount({
      projectileContrast: 'high',
      effectDensity: 'minimal',
      renderResolution: 'auto',
    }),
  ).toBe(0);
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
  const settings = {
    projectileContrast: 'high',
    effectDensity: 'reduced',
    renderResolution: 'full',
  } as const;
  await platform.saveVisualSettings(settings);
  await platform.saveMuted(true);
  expect(writes[0]).toMatchObject({ muted: false, visualSettings: settings });
  expect(writes[1]).toMatchObject({ muted: true, visualSettings: settings });
});

it.each(['2d', '3d', 'unknown', undefined])(
  'loads retired terrain preference %s without losing other profile settings',
  (terrainRenderer) => {
    const visualSettings = { projectileContrast: 'high', effectDensity: 'reduced' };
    const profile = {
      version: 1,
      bestSeconds: 55,
      muted: true,
      visualSettings: {
        ...visualSettings,
        terrainRenderer,
        softwareTerrainNoticeDismissed: true,
      },
    };
    expect(isProfile(profile)).toBe(true);
    // Profiles saved before the 3D resolution setting load with it automatic.
    expect(normalizeProfile(JSON.parse(JSON.stringify(profile)))).toEqual({
      ...profile,
      visualSettings: { ...visualSettings, renderResolution: 'auto' },
    });
    expect(normalizeVisualSettings(profile.visualSettings)).toEqual({
      ...visualSettings,
      renderResolution: 'auto',
    });
  },
);

it('keeps a locked 3D resolution and rejects unknown resolution values', () => {
  const locked = { projectileContrast: 'high', effectDensity: 'reduced', renderResolution: 'full' };
  expect(normalizeVisualSettings(locked)).toEqual(locked);
  const profile = {
    version: 1,
    bestSeconds: 55,
    muted: true,
    visualSettings: { ...locked, renderResolution: 'ultra' },
  };
  expect(isProfile(profile)).toBe(false);
  expect(normalizeProfile(profile)).toMatchObject({
    muted: true,
    visualSettings: { projectileContrast: 'standard', renderResolution: 'auto' },
  });
});

it('offers the 3D resolution choice in the settings menu, automatic by default', () => {
  const button = (html: string) =>
    html.match(/<button[^>]*data-visual-setting="renderResolution"[^>]*>([^<]*)<\/button>/);
  const automatic = button(settingsMenu(false, false))!;
  expect(automatic[1]).toBe('Automatic');
  expect(automatic[0]).toContain('aria-pressed="false"');
  const locked = button(
    settingsMenu(false, false, undefined, {
      projectileContrast: 'standard',
      effectDensity: 'full',
      renderResolution: 'full',
    }),
  )!;
  expect(locked[1]).toBe('100%');
  expect(locked[0]).toContain('aria-pressed="true"');
});
