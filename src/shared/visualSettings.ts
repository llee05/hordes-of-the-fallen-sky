export interface VisualSettings {
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
    ['full', 'reduced', 'minimal'].includes(settings.effectDensity as string)
  );
}
export function normalizeVisualSettings(value: unknown): VisualSettings {
  return isVisualSettings(value)
    ? { projectileContrast: value.projectileContrast, effectDensity: value.effectDensity }
    : defaultVisualSettings();
}
export function effectAmount(settings: VisualSettings): number {
  return settings.effectDensity === 'minimal' ? 0 : settings.effectDensity === 'reduced' ? 0.4 : 1;
}
