export type TerrainRenderer = '3d' | '2d';

export interface VisualSettings {
  /** Absent until the player chooses; automatic detection must not become a preference. */
  terrainRenderer?: TerrainRenderer;
  softwareTerrainNoticeDismissed?: boolean;
  projectileContrast: 'standard' | 'high';
  effectDensity: 'full' | 'reduced' | 'minimal';
}
export function defaultVisualSettings(): VisualSettings {
  return { projectileContrast: 'standard', effectDensity: 'full' };
}
export function isVisualSettings(value: unknown): value is VisualSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return (
    ['standard', 'high'].includes(settings.projectileContrast as string) &&
    ['full', 'reduced', 'minimal'].includes(settings.effectDensity as string) &&
    (settings.terrainRenderer === undefined ||
      ['3d', '2d'].includes(settings.terrainRenderer as string)) &&
    (settings.softwareTerrainNoticeDismissed === undefined ||
      typeof settings.softwareTerrainNoticeDismissed === 'boolean')
  );
}
export function normalizeVisualSettings(value: unknown): VisualSettings {
  return isVisualSettings(value)
    ? {
        projectileContrast: value.projectileContrast,
        effectDensity: value.effectDensity,
        ...(value.terrainRenderer === undefined ? {} : { terrainRenderer: value.terrainRenderer }),
        ...(value.softwareTerrainNoticeDismissed === undefined
          ? {}
          : { softwareTerrainNoticeDismissed: value.softwareTerrainNoticeDismissed }),
      }
    : defaultVisualSettings();
}
export function effectAmount(settings: VisualSettings): number {
  return settings.effectDensity === 'minimal' ? 0 : settings.effectDensity === 'reduced' ? 0.4 : 1;
}

/** Renderer strings are injected so fallback policy can be tested without a GPU. */
export function isSoftwareWebGL(renderer: string | undefined): boolean {
  return /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(renderer ?? '');
}

export function resolveTerrainRenderer(
  settings: VisualSettings,
  renderer?: string,
): TerrainRenderer {
  return settings.terrainRenderer ?? (isSoftwareWebGL(renderer) ? '2d' : '3d');
}

export function showSoftwareTerrainNotice(settings: VisualSettings, renderer?: string): boolean {
  return (
    settings.terrainRenderer === undefined &&
    !settings.softwareTerrainNoticeDismissed &&
    isSoftwareWebGL(renderer)
  );
}

/** Debug renderer info can be unavailable or blocked by privacy settings. */
export function webGLRendererName(gl?: {
  getExtension(name: 'WEBGL_debug_renderer_info'): { UNMASKED_RENDERER_WEBGL: number } | null;
  getParameter(parameter: number): unknown;
}): string | undefined {
  try {
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer: unknown = info && gl?.getParameter(info.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === 'string' ? renderer : undefined;
  } catch {
    return undefined;
  }
}
