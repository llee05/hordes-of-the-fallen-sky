import type { CampArchive } from '../shared/campArchive';
import type { DesktopBridge } from '../shared/desktop';
import { defaultProfile, normalizeProfile } from '../shared/profile';
import type { PlayerProfile } from '../shared/profile';
import { normalizeDeveloperHistory } from '../shared/developerHistory';

export class GamePlatform {
  private pendingSave: Promise<void> = Promise.resolve();
  private constructor(
    readonly profile: PlayerProfile,
    readonly desktop?: DesktopBridge,
  ) {}

  static async create(): Promise<GamePlatform> {
    if (window.desktop) {
      return new GamePlatform(normalizeProfile(await window.desktop.loadProfile()), window.desktop);
    }
    let profile = defaultProfile();
    try {
      const stored = localStorage.getItem('gloam-profile');
      if (stored) profile = normalizeProfile(JSON.parse(stored));
      // Keep the original browser prototype's score when opening an old preview.
      profile.bestSeconds = Math.max(
        profile.bestSeconds,
        Math.max(0, Math.floor(Number(localStorage.getItem('gloam-best')) || 0)),
      );
    } catch {
      /* The web preview remains playable with unavailable storage. */
    }
    return new GamePlatform(profile);
  }

  saveBest(seconds: number): Promise<void> {
    this.profile.bestSeconds = Math.max(this.profile.bestSeconds, Math.floor(seconds));
    return this.save();
  }

  saveMuted(muted: boolean): Promise<void> {
    this.profile.muted = muted;
    return this.save();
  }

  saveDeveloperCommandHistory(commands: readonly string[]): Promise<void> {
    if (!import.meta.env.DEV) return Promise.resolve();
    const history = normalizeDeveloperHistory(commands);
    if (history.length) this.profile.developerCommandHistory = history;
    else delete this.profile.developerCommandHistory;
    return this.save();
  }

  saveCamp(camp: CampArchive): Promise<void> {
    this.profile.camp = structuredClone(camp);
    return this.save();
  }

  private save(): Promise<void> {
    const snapshot = structuredClone(this.profile);
    // Serialize snapshots; an older write must never replace a newer score/setting.
    const operation = this.pendingSave
      .catch(() => undefined)
      .then(async () => {
        if (this.desktop) await this.desktop.saveProfile(snapshot);
        else {
          localStorage.setItem('gloam-profile', JSON.stringify(snapshot));
          localStorage.setItem('gloam-best', String(snapshot.bestSeconds));
        }
      });
    this.pendingSave = operation;
    return operation;
  }
}
