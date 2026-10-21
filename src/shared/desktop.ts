import type { PlayerProfile } from './profile.js';

/** The entire privileged API. The renderer never receives Node, paths, or raw IPC. */
export interface DesktopBridge {
  loadProfile(): Promise<PlayerProfile>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  toggleFullscreen(): Promise<boolean>;
  isFullscreen(): Promise<boolean>;
  quit(): Promise<void>;
  onFullscreenChanged(listener: (fullscreen: boolean) => void): () => void;
}
