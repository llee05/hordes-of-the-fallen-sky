import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultProfile, isProfile, normalizeProfile } from '../src/shared/profile.js';
import type { PlayerProfile } from '../src/shared/profile.js';

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
}
