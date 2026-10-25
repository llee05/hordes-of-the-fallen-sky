import type { PlayerProfile } from './profile.js';
import type { SaveSlot, ExpeditionSave, SaveListing } from './expeditionSave.js';

/** The entire privileged API. The renderer never receives Node, paths, or raw IPC. */
export interface DesktopBridge {
  loadProfile(): Promise<PlayerProfile>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  listExpeditions(): Promise<SaveListing[]>;
  loadExpedition(slot: SaveSlot): Promise<ExpeditionSave>;
  saveExpedition(slot: SaveSlot, save: ExpeditionSave): Promise<void>;
  deleteExpedition(slot: SaveSlot): Promise<void>;
  toggleFullscreen(): Promise<boolean>;
  isFullscreen(): Promise<boolean>;
  quit(): Promise<void>;
  onFullscreenChanged(listener: (fullscreen: boolean) => void): () => void;
}
