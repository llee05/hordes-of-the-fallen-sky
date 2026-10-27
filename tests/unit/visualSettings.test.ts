import { expect, it, vi, afterEach } from 'vitest';
import { isProfile, normalizeProfile } from '../../src/shared/profile';
import {
  normalizeVisualSettings,
  effectAmount,
  isSoftwareWebGL,
  resolveTerrainRenderer,
  showSoftwareTerrainNotice,
  webGLRendererName,
} from '../../src/shared/visualSettings';
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
  const settings = {
    projectileContrast: 'high',
    effectDensity: 'reduced',
    terrainRenderer: '2d',
    softwareTerrainNoticeDismissed: true,
  } as const;
  await platform.saveVisualSettings(settings);
  await platform.saveMuted(true);
  expect(writes[0]).toMatchObject({ muted: false, visualSettings: settings });
  expect(writes[1]).toMatchObject({ muted: true, visualSettings: settings });
});

it.each([
  ['ANGLE (Google, Vulkan SwiftShader Device (Subzero))', true],
  ['Mesa llvmpipe (LLVM 18.1.8, 256 bits)', true],
  ['softpipe', true],
  ['Software Rasterizer', true],
  ['Mesa Intel(R) UHD Graphics 620', false],
  ['ANGLE (NVIDIA GeForce)', false],
  [undefined, false],
  ['', false],
] as const)('detects software WebGL: %s', (renderer, software) => {
  expect(isSoftwareWebGL(renderer)).toBe(software);
  const settings = normalizeVisualSettings(undefined);
  expect(resolveTerrainRenderer(settings, renderer)).toBe(software ? '2d' : '3d');
  expect(showSoftwareTerrainNotice(settings, renderer)).toBe(software);
});

it('keeps explicit terrain choices ahead of detection and dismisses only the automatic notice', () => {
  const defaults = normalizeVisualSettings(undefined);
  for (const terrainRenderer of ['2d', '3d'] as const) {
    const settings = { ...defaults, terrainRenderer };
    for (const renderer of ['SwiftShader', 'Intel', undefined]) {
      expect(resolveTerrainRenderer(settings, renderer)).toBe(terrainRenderer);
      expect(showSoftwareTerrainNotice(settings, renderer)).toBe(false);
    }
  }
  const dismissed = { ...defaults, softwareTerrainNoticeDismissed: true };
  expect(showSoftwareTerrainNotice(dismissed, 'llvmpipe')).toBe(false);
  expect(resolveTerrainRenderer(dismissed, 'llvmpipe')).toBe('2d');
  expect(resolveTerrainRenderer(dismissed, 'Intel')).toBe('3d');
});

it('validates and round trips terrain preferences while accepting older visual profiles', () => {
  const legacy = {
    version: 1,
    bestSeconds: 55,
    muted: true,
    visualSettings: normalizeVisualSettings(undefined),
  };
  expect(isProfile(legacy)).toBe(true);
  expect(normalizeProfile(legacy)).toEqual(legacy);
  for (const terrainRenderer of ['2d', '3d'] as const) {
    const profile = {
      ...legacy,
      visualSettings: {
        ...legacy.visualSettings,
        terrainRenderer,
        softwareTerrainNoticeDismissed: true,
      },
    };
    expect(isProfile(profile)).toBe(true);
    expect(normalizeProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
  }
  expect(
    isProfile({
      ...legacy,
      visualSettings: { ...legacy.visualSettings, terrainRenderer: 'unknown' },
    }),
  ).toBe(false);
  expect(
    isProfile({
      ...legacy,
      visualSettings: { ...legacy.visualSettings, softwareTerrainNoticeDismissed: 'yes' },
    }),
  ).toBe(false);
});

it('reads unmasked renderer info and tolerates unavailable or blocked extensions', () => {
  const getParameter = vi.fn(() => 'Mesa llvmpipe');
  const gl = {
    getExtension: vi.fn(() => ({ UNMASKED_RENDERER_WEBGL: 37446 })),
    getParameter,
  } as unknown as WebGLRenderingContext;
  expect(webGLRendererName(gl)).toBe('Mesa llvmpipe');
  expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_debug_renderer_info');
  expect(getParameter).toHaveBeenCalledWith(37446);
  expect(webGLRendererName()).toBeUndefined();
  expect(
    webGLRendererName({ getExtension: () => null } as unknown as WebGLRenderingContext),
  ).toBeUndefined();
  expect(
    webGLRendererName({
      getExtension: () => {
        throw new Error('blocked');
      },
    } as unknown as WebGLRenderingContext),
  ).toBeUndefined();
});
