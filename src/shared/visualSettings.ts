export interface VisualSettings {
  projectileContrast: 'standard' | 'high';
  effectDensity: 'full' | 'reduced' | 'minimal';
  /**
   * 3D battlefield resolution: `auto` lowers it after sustained slow frames and restores it when
   * frames recover; `full` always draws every pixel. Profiles saved before it existed load as auto.
   */
  renderResolution: 'auto' | 'full';
}
export function defaultVisualSettings(): VisualSettings {
  return { projectileContrast: 'standard', effectDensity: 'full', renderResolution: 'auto' };
}
export function isVisualSettings(value: unknown): value is VisualSettings {
  if (!value || typeof value !== 'object') return false;
  // Retired terrain and software-notice fields are ignored when loading older profiles.
  const settings = value as Record<string, unknown>;
  return (
    ['standard', 'high'].includes(settings.projectileContrast as string) &&
    ['full', 'reduced', 'minimal'].includes(settings.effectDensity as string) &&
    (settings.renderResolution === undefined ||
      ['auto', 'full'].includes(settings.renderResolution as string))
  );
}
export function normalizeVisualSettings(value: unknown): VisualSettings {
  return isVisualSettings(value)
    ? {
        projectileContrast: value.projectileContrast,
        effectDensity: value.effectDensity,
        renderResolution: value.renderResolution ?? 'auto',
      }
    : defaultVisualSettings();
}
export function effectAmount(settings: VisualSettings): number {
  return settings.effectDensity === 'minimal' ? 0 : settings.effectDensity === 'reduced' ? 0.4 : 1;
}
/** Settings-menu label for the 3D resolution choice. */
export function resolutionLabel(resolution: VisualSettings['renderResolution']): string {
  return resolution === 'full' ? '100%' : 'Automatic';
}
