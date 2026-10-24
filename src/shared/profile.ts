import { isDeveloperHistory, normalizeDeveloperHistory } from './developerHistory.js';

export interface PlayerProfile {
  version: 1;
  bestSeconds: number;
  muted: boolean;
  developerCommandHistory?: string[];
}

export function defaultProfile(): PlayerProfile {
  return { version: 1, bestSeconds: 0, muted: false };
}

export function isProfile(value: unknown): value is PlayerProfile {
  return (
    isProfileCore(value) &&
    (!('developerCommandHistory' in value) ||
      value.developerCommandHistory === undefined ||
      isDeveloperHistory(value.developerCommandHistory))
  );
}

function isProfileCore(value: unknown): value is Omit<PlayerProfile, 'developerCommandHistory'> {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    profile.version === 1 &&
    typeof profile.bestSeconds === 'number' &&
    Number.isInteger(profile.bestSeconds) &&
    profile.bestSeconds >= 0 &&
    profile.bestSeconds <= 86400 &&
    typeof profile.muted === 'boolean'
  );
}

export function normalizeProfile(value: unknown): PlayerProfile {
  if (!isProfileCore(value)) return defaultProfile();
  const history = normalizeDeveloperHistory(
    'developerCommandHistory' in value ? value.developerCommandHistory : undefined,
  );
  return {
    version: 1,
    bestSeconds: value.bestSeconds,
    muted: value.muted,
    ...(history.length ? { developerCommandHistory: history } : {}),
  };
}
