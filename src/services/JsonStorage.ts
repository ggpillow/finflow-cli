import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ILoadResult, IPersistedState } from '../types/interfaces.js';
import { parseStateJson, STATE_VERSION } from './stateCodec.js';

const DEFAULT_PATH = join('data', 'state.json');
const JSON_INDENT = 2;

export class JsonStorage {
  public constructor(private readonly filePath: string = DEFAULT_PATH) {}

  public async load(): Promise<ILoadResult> {
    let raw: string;

    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch {
      return { state: null, warning: null };
    }

    const state = parseStateJson(raw);

    if (state === null) {
      await this.backupCorrupted();
      return {
        state: null,
        warning: 'Файл данных повреждён или несовместим — начали с чистого листа, копия сохранена',
      };
    }

    return { state, warning: null };
  }

  public async save(state: IPersistedState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, JSON_INDENT), 'utf8');
  }

  private async backupCorrupted(): Promise<void> {
    try {
      await rename(this.filePath, `${this.filePath}.broken`);
    } catch {
    }
  }
}

export { STATE_VERSION };