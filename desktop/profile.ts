import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultProfile, isProfile, normalizeProfile } from '../src/shared/profile.js';
import type { PlayerProfile } from '../src/shared/profile.js';
import {
  SAVE_SLOTS,
  MAX_SAVE_BYTES,
  isSaveSlot,
  isExpeditionSave,
  saveListing,
  type SaveSlot,
  type ExpeditionSave,
  type SaveListing,
} from '../src/shared/expeditionSave.js';

export class ProfileStore {
  private queue: Promise<void> = Promise.resolve();
  readonly file: string;

  constructor(private readonly directory: string) {
    this.file = join(directory, 'profile.json');
  }

  async load(): Promise<PlayerProfile> {
    await this.queue.catch(() => undefined);
    try {
      return normalizeProfile(JSON.parse(await readFile(this.file, 'utf8')));
    } catch (error) {
      if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === 'ENOENT')
        return defaultProfile();
      throw error;
    }
  }

  save(value: unknown): Promise<void> {
    if (!isProfile(value)) return Promise.reject(new Error('Invalid player profile'));
    const snapshot = normalizeProfile(value);
    const operation = this.queue
      .catch(() => undefined)
      .then(async () => {
        await mkdir(this.directory, { recursive: true });
        const temporary = `${this.file}.tmp`;
        await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600 });
        await rename(temporary, this.file);
      });
    this.queue = operation;
    return operation;
  }

  async flush(): Promise<void> {
    await this.queue.catch(() => undefined);
  }

  private slotFile(slot: unknown): string {
    if (!isSaveSlot(slot)) throw new Error('Invalid save slot');
    return join(this.directory, `expedition-${slot}.json`);
  }

  private async readSave(file: string): Promise<unknown> {
    try {
      if ((await stat(file)).size > MAX_SAVE_BYTES) return null;
      return JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      if (error instanceof SyntaxError) return null;
      throw error;
    }
  }

  private async readSlot(
    slot: SaveSlot,
  ): Promise<{ save?: ExpeditionSave; listing?: SaveListing }> {
    const file = this.slotFile(slot);
    const primary = await this.readSave(file);
    if (isExpeditionSave(primary)) return { save: primary, listing: saveListing(slot, primary) };
    if (primary && typeof primary === 'object' && 'version' in primary && primary.version !== 1)
      return { listing: { slot, status: 'incompatible' } };
    const backup = await this.readSave(`${file}.bak`);
    if (isExpeditionSave(backup)) return { save: backup, listing: saveListing(slot, backup, true) };
    return {
      listing:
        primary !== undefined || backup !== undefined ? { slot, status: 'damaged' } : undefined,
    };
  }

  async listExpeditions(): Promise<SaveListing[]> {
    await this.flush();
    const slots = await Promise.all(SAVE_SLOTS.map((slot) => this.readSlot(slot)));
    return slots.flatMap(({ listing }) => (listing ? [listing] : []));
  }

  async loadExpedition(slot: SaveSlot): Promise<ExpeditionSave> {
    this.slotFile(slot);
    await this.flush();
    const { save } = await this.readSlot(slot);
    if (!save) throw new Error('Save is missing, damaged, or from an unsupported version');
    return save;
  }

  saveExpedition(slot: SaveSlot, value: unknown): Promise<void> {
    const file = this.slotFile(slot);
    if (!isExpeditionSave(value)) return Promise.reject(new Error('Invalid expedition save'));
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized) > MAX_SAVE_BYTES)
      return Promise.reject(new Error('Save is too large'));
    const operation = this.queue
      .catch(() => undefined)
      .then(async () => {
        await mkdir(this.directory, { recursive: true });
        const previous = await this.readSave(file);
        // A damaged primary must never replace the last good backup.
        if (isExpeditionSave(previous))
          await this.atomicWrite(`${file}.bak`, JSON.stringify(previous));
        await this.atomicWrite(file, serialized);
      });
    this.queue = operation;
    return operation;
  }

  deleteExpedition(slot: SaveSlot): Promise<void> {
    const file = this.slotFile(slot);
    const operation = this.queue
      .catch(() => undefined)
      .then(async () => {
        for (const suffix of ['', '.bak', '.tmp', '.bak.tmp'])
          await unlink(`${file}${suffix}`).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'ENOENT') throw error;
          });
      });
    this.queue = operation;
    return operation;
  }

  private async atomicWrite(file: string, data: string): Promise<void> {
    const handle = await open(`${file}.tmp`, 'w', 0o600);
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(`${file}.tmp`, file);
  }
}
