import type { CampArchive } from '../shared/campArchive';
import type { DesktopBridge } from '../shared/desktop';
import { defaultProfile, normalizeProfile } from '../shared/profile';
import type { PlayerProfile } from '../shared/profile';
import { normalizeDeveloperHistory } from '../shared/developerHistory';
import { normalizeAudioMix, type AudioMix } from '../shared/audioSettings';
import { normalizeVisualSettings, type VisualSettings } from '../shared/visualSettings';
import {
  SAVE_SLOTS,
  isSaveSlot,
  isExpeditionSave,
  saveListing,
  MAX_SAVE_BYTES,
  type SaveSlot,
  type ExpeditionSave,
  type SaveListing,
} from '../shared/expeditionSave';

export class GamePlatform {
  private pendingSave: Promise<void> = Promise.resolve();
  private pendingExpedition: Promise<void> = Promise.resolve();
  saves: SaveListing[] = [];
  saveStorageError = false;
  private constructor(
    readonly profile: PlayerProfile,
    readonly desktop?: DesktopBridge,
  ) {}

  static async create(): Promise<GamePlatform> {
    if (window.desktop) {
      const platform = new GamePlatform(
        normalizeProfile(await window.desktop.loadProfile()),
        window.desktop,
      );
      await platform.refreshSaves().catch(() => {
        platform.saveStorageError = true;
      });
      return platform;
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
    const platform = new GamePlatform(profile);
    await platform.refreshSaves().catch(() => {
      platform.saveStorageError = true;
    });
    return platform;
  }

  async refreshSaves(): Promise<void> {
    await this.pendingExpedition.catch(() => undefined);
    this.saves = this.desktop
      ? await this.desktop.listExpeditions()
      : SAVE_SLOTS.flatMap((slot) => {
          const { listing } = this.readBrowserSave(slot);
          return listing ? [listing] : [];
        });
    this.saveStorageError = false;
  }

  async loadExpedition(slot: SaveSlot): Promise<ExpeditionSave> {
    if (!isSaveSlot(slot)) throw new Error('Invalid save slot');
    await this.pendingExpedition.catch(() => undefined);
    const save = this.desktop
      ? await this.desktop.loadExpedition(slot)
      : this.readBrowserSave(slot).save;
    if (!isExpeditionSave(save)) throw new Error('This save could not be loaded');
    return structuredClone(save);
  }

  saveExpedition(slot: SaveSlot, save: ExpeditionSave): Promise<void> {
    if (!isSaveSlot(slot) || !isExpeditionSave(save))
      return Promise.reject(new Error('Invalid save'));
    const serialized = JSON.stringify(save);
    if (new TextEncoder().encode(serialized).length > MAX_SAVE_BYTES)
      return Promise.reject(new Error('Save is too large'));
    const snapshot = JSON.parse(serialized) as ExpeditionSave;
    const operation = this.pendingExpedition
      .catch(() => undefined)
      .then(async () => {
        if (this.desktop) await this.desktop.saveExpedition(slot, snapshot);
        else {
          const key = `gloam-expedition-${slot}`;
          const previous = this.browserValue(key);
          if (isExpeditionSave(previous))
            localStorage.setItem(`${key}-backup`, JSON.stringify(previous));
          localStorage.setItem(key, serialized);
        }
        this.saves = [
          ...this.saves.filter((entry) => entry.slot !== slot),
          saveListing(slot, snapshot),
        ];
        this.saveStorageError = false;
      });
    this.pendingExpedition = operation;
    return operation;
  }

  deleteExpedition(slot: SaveSlot): Promise<void> {
    if (!isSaveSlot(slot)) return Promise.reject(new Error('Invalid save slot'));
    const operation = this.pendingExpedition
      .catch(() => undefined)
      .then(async () => {
        if (this.desktop) await this.desktop.deleteExpedition(slot);
        else {
          localStorage.removeItem(`gloam-expedition-${slot}`);
          localStorage.removeItem(`gloam-expedition-${slot}-backup`);
        }
        this.saves = this.saves.filter((entry) => entry.slot !== slot);
      });
    this.pendingExpedition = operation;
    return operation;
  }

  async flush(): Promise<void> {
    await Promise.all([this.pendingSave, this.pendingExpedition]);
  }

  private browserValue(key: string): unknown {
    const value = localStorage.getItem(key);
    if (!value) return undefined;
    if (value.length > MAX_SAVE_BYTES) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private readBrowserSave(slot: SaveSlot): { save?: ExpeditionSave; listing?: SaveListing } {
    const key = `gloam-expedition-${slot}`;
    const save = this.browserValue(key);
    if (isExpeditionSave(save)) return { save, listing: saveListing(slot, save) };
    if (save && typeof save === 'object' && 'version' in save && save.version !== 1)
      return { listing: { slot, status: 'incompatible' } };
    const backup = this.browserValue(`${key}-backup`);
    if (isExpeditionSave(backup)) return { save: backup, listing: saveListing(slot, backup, true) };
    return {
      listing: save !== undefined || backup !== undefined ? { slot, status: 'damaged' } : undefined,
    };
  }

  saveBest(seconds: number): Promise<void> {
    this.profile.bestSeconds = Math.max(this.profile.bestSeconds, Math.floor(seconds));
    return this.save();
  }

  saveMuted(muted: boolean): Promise<void> {
    this.profile.muted = muted;
    return this.save();
  }

  saveAudioMix(mix: AudioMix): Promise<void> {
    this.profile.audioMix = normalizeAudioMix(mix);
    return this.save();
  }

  saveVisualSettings(settings: VisualSettings): Promise<void> {
    this.profile.visualSettings = normalizeVisualSettings(settings);
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
