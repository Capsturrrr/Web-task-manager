import { parseTasks } from './schema';
import type { Task } from './types';

export const STORAGE_KEY = 'stm.tasks.v2';
/** Version 1 (the plain-JavaScript app) stored a bare array under this key. */
export const LEGACY_KEY = 'stm.tasks.v1';
const SCHEMA_VERSION = 2;

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function read(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined; // blocked storage or corrupted JSON: treat as empty
  }
}

/**
 * Loads saved tasks. On first run of version 2 it migrates version-1 data,
 * saves it under the new key and removes the old one, so nobody loses tasks.
 */
export function loadTasks(store: KeyValueStore): Task[] {
  const current = read(store, STORAGE_KEY);
  if (typeof current === 'object' && current !== null && 'tasks' in current) {
    return parseTasks(current.tasks).tasks;
  }
  const legacy = read(store, LEGACY_KEY);
  if (Array.isArray(legacy)) {
    const { tasks } = parseTasks(legacy);
    if (saveTasks(store, tasks)) {
      try {
        store.removeItem(LEGACY_KEY);
      } catch {
        // keep the old copy if it can't be removed; it is ignored from now on
      }
    }
    return tasks;
  }
  return [];
}

/** Returns false when the browser refuses to store (full, or blocked in private mode). */
export function saveTasks(store: KeyValueStore, tasks: readonly Task[]): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, tasks }));
    return true;
  } catch {
    return false;
  }
}

/** localStorage, or an in-memory stand-in when the browser blocks it. */
export function browserStore(): KeyValueStore {
  try {
    const probe = '__stm_probe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    };
  }
}
