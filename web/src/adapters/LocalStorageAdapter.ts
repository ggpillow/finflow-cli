import type { ILoadResult, IPersistedState } from '../../../src/types/interfaces.js';
import { parseStateJson } from '../../../src/services/stateCodec.js';

const STORAGE_KEY = 'finflow.state.v2';
const isAvailable = (): boolean => {
  try {
    const probe = '__finflow_probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

export class LocalStorageAdapter {
  private readonly persistent = isAvailable();
  private memory: string | null = null;

  public load(): ILoadResult {
    const raw = this.read();

    if (raw === null) {
      return { state: null, warning: null };
    }

    const state = parseStateJson(raw);

    if (state === null) {
      this.write(null);
      return {
        state: null,
        warning: 'Сохранённые данные повреждены — начали с чистого листа',
      };
    }

    return { state, warning: null };
  }

  public save(state: IPersistedState): void {
    this.write(JSON.stringify(state));
  }

  public reset(): void {
    this.write(null);
  }

  private read(): string | null {
    if (!this.persistent) {
      return this.memory;
    }
    try {
      return globalThis.localStorage.getItem(STORAGE_KEY);
    } catch {
      return this.memory;
    }
  }

  private write(value: string | null): void {
    this.memory = value;

    if (!this.persistent) {
      return;
    }
    try {
      if (value === null) {
        globalThis.localStorage.removeItem(STORAGE_KEY);
      } else {
        globalThis.localStorage.setItem(STORAGE_KEY, value);
      }
    } catch {
    }
  }
}