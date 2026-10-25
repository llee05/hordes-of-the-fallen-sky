import { isCampArchive, normalizeCampArchive, type CampArchive } from './campArchive.js';
import { isDeveloperHistory, normalizeDeveloperHistory } from './developerHistory.js';
import { isAudioMix, normalizeAudioMix, type AudioMix } from './audioSettings.js';
import {
  isVisualSettings,
  normalizeVisualSettings,
  type VisualSettings,
} from './visualSettings.js';

export interface PlayerProfile {
  version: 1;
  bestSeconds: number;
  muted: boolean;
  audioMix?: AudioMix;
  visualSettings?: VisualSettings;
  developerCommandHistory?: string[];
  camp?: CampArchive;
}

export function defaultProfile(): PlayerProfile {
  return { version: 1, bestSeconds: 0, muted: false };
}

export function isProfile(value: unknown): value is PlayerProfile {
  return (
    isProfileCore(value) &&
    (!('visualSettings' in value) ||
      value.visualSettings === undefined ||
      isVisualSettings(value.visualSettings)) &&
    (!('audioMix' in value) || value.audioMix === undefined || isAudioMix(value.audioMix)) &&
    (!('camp' in value) || value.camp === undefined || isCampArchive(value.camp)) &&
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
  const camp = normalizeCampArchive('camp' in value ? value.camp : undefined);
  return {
    version: 1,
    bestSeconds: value.bestSeconds,
    muted: value.muted,
    ...('visualSettings' in value && value.visualSettings !== undefined
      ? { visualSettings: normalizeVisualSettings(value.visualSettings) }
      : {}),
    ...('audioMix' in value && value.audioMix !== undefined
      ? { audioMix: normalizeAudioMix(value.audioMix) }
      : {}),
    ...(history.length ? { developerCommandHistory: history } : {}),
    ...(camp ? { camp } : {}),
  };
}
