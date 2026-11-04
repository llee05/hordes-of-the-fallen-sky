import type { SaveSlot } from '../../../shared/expeditionSave';
import type { GamePlatform } from '../../../platform/GamePlatform';
import { GAME } from '../../config';
import { captureCampArchive } from '../../state/campArchive';
import { captureExpedition, type WorldArchive } from '../../state/expeditionArchive';
import type { RunState } from '../../types';

/** What saving needs from the scene. Read live: the run and session change on load and restart. */
export interface PersistenceHost {
  readonly run: RunState;
  readonly developerRun: boolean;
  captureWorld(): WorldArchive;
  publishPhase(): void;
  onSaveError(): void;
}

/**
 * Expedition and camp saving: one queued write at a time, a generation guard
 * that drops unstarted saves and ignores stale save completions, coalesced
 * checkpoints and the autosave clock. The scene creates this once, so the queue and generation
 * survive `scene.restart`; `reset` runs at the start of every `create`.
 */
export class ArenaPersistence {
  /** True after the expedition begins, loads or continues from camp. */
  started = false;
  /** A save, load or delete is in progress. */
  busy = false;
  /** The latest save-menu status line. */
  message = '';
  private pending: Promise<boolean> = Promise.resolve(true);
  private autosaveRemaining: number = GAME.saves.autosaveInterval;
  private checkpointQueued = false;
  private checkpointDirty = false;
  private generation = 0;

  constructor(
    private readonly platform: GamePlatform,
    private readonly host: PersistenceHost,
  ) {}

  /** Invalidates unstarted saves and session updates from in-flight save completions. */
  reset(): void {
    this.generation++;
    this.started = false;
    this.busy = false;
    this.autosaveRemaining = GAME.saves.autosaveInterval;
    this.checkpointQueued = false;
    this.checkpointDirty = false;
    this.message = '';
  }

  /** Marks the expedition started and schedules its first autosave shortly after. */
  begin(): void {
    this.started = true;
    this.autosaveRemaining = 0.5;
  }

  get canSave(): boolean {
    const run = this.host.run;
    return (
      this.started &&
      !this.host.developerRun &&
      !run.legacy.outcome &&
      run.clan.population > 0 &&
      run.clan.integrity > 0
    );
  }

  save(slot: SaveSlot = 'auto'): Promise<boolean> {
    if (!this.canSave) return Promise.resolve(false);
    const generation = this.generation;
    const operation = this.pending
      .catch(() => false)
      .then(() => (generation === this.generation ? this.persist(slot) : false));
    this.pending = operation;
    return operation;
  }

  /** Counts down active seconds and autosaves when the interval ends. */
  tick(dt: number): void {
    this.autosaveRemaining -= dt;
    if (this.autosaveRemaining <= 0 && !this.busy) {
      this.autosaveRemaining = GAME.saves.autosaveInterval;
      void this.save();
    }
  }

  /** Saves the camp archive, then checkpoints the whole expedition. */
  saveCamp(): void {
    if (this.host.developerRun) return;
    void this.platform
      .saveCamp(captureCampArchive(this.host.run))
      .catch(() => this.host.onSaveError());
    this.requestCheckpoint();
  }

  requestCheckpoint(): void {
    if (!this.canSave) return;
    this.checkpointDirty = true;
    if (this.checkpointQueued) return;
    this.checkpointQueued = true;
    const generation = this.generation;
    // Arrival and purchases finish all synchronous state/terrain changes before capture.
    queueMicrotask(() => {
      if (generation !== this.generation) return;
      this.checkpointQueued = false;
      this.autosaveRemaining = 0;
      if (!this.busy) void this.save();
    });
  }

  /** Loads a slot through `open`; on failure, reports it and calls `showSaves`. */
  async load(open: () => Promise<void>, showSaves: () => void): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.message = 'Loading…';
    if (this.host.run.phase === 'saves') this.host.publishPhase();
    try {
      await open();
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'This save could not be loaded.';
      showSaves();
    } finally {
      this.busy = false;
      if (this.host.run.phase === 'saves') this.host.publishPhase();
    }
  }

  async delete(slot: SaveSlot): Promise<void> {
    if (this.host.run.phase !== 'saves' || this.busy) return;
    this.busy = true;
    try {
      await this.platform.deleteExpedition(slot);
      this.message = 'Save deleted.';
    } catch {
      this.message = 'The save could not be deleted. Try again.';
    } finally {
      this.busy = false;
      this.host.publishPhase();
    }
  }

  /** Finishes queued writes and saves once more before the window closes. */
  async prepareToClose(): Promise<boolean> {
    try {
      await this.pending;
      // A new write can recover from an earlier transient storage error.
      await this.platform.flush().catch(() => undefined);
      if (this.canSave && !(await this.save())) return false;
      await this.platform.flush();
      return true;
    } catch {
      this.host.onSaveError();
      return false;
    }
  }

  private async persist(slot: SaveSlot): Promise<boolean> {
    if (!this.canSave || this.busy) return false;
    const generation = this.generation;
    this.busy = true;
    this.checkpointDirty = false;
    this.message = 'Saving…';
    if (this.host.run.phase === 'saves') this.host.publishPhase();
    try {
      const snapshot = captureExpedition(this.host.run, this.host.captureWorld());
      await this.platform.saveExpedition(slot, snapshot);
      if (generation !== this.generation) return true;
      this.autosaveRemaining = GAME.saves.autosaveInterval;
      this.message = slot === 'auto' ? 'Autosave complete.' : 'Expedition saved.';
      return true;
    } catch {
      if (generation !== this.generation) return false;
      this.message =
        'Saving failed. Your previous save is still available. Check available storage and try again.';
      this.host.onSaveError();
      return false;
    } finally {
      if (generation === this.generation) {
        this.busy = false;
        if (this.host.run.phase === 'saves') this.host.publishPhase();
        if (this.checkpointDirty) this.requestCheckpoint();
      }
    }
  }
}
