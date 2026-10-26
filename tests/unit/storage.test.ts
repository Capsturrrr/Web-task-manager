import { describe, expect, it } from 'vitest';
import { parseTasks } from '../../src/schema';
import { LEGACY_KEY, loadTasks, saveTasks, STORAGE_KEY } from '../../src/storage';

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('parseTasks', () => {
  it('repairs fixable fields and drops unusable entries', () => {
    const { tasks, skipped } = parseTasks(
      [
        {
          id: 'a',
          text: ' ok ',
          priority: 'urgent',
          due: '2026-02-30',
          done: 'yes',
          createdAt: 'x',
        },
        { id: 'b', text: '' },
        'not a task',
        { id: 'a', text: 'duplicate id' },
        { text: 'no id' },
      ],
      99,
    );
    expect(skipped).toBe(3);
    expect(tasks[0]).toEqual({
      id: 'a',
      text: 'ok',
      priority: 'low',
      due: null,
      done: false,
      createdAt: 99,
    });
    expect(tasks[1]?.text).toBe('no id');
    expect(tasks[1]?.id).toBeTruthy();
  });

  it('returns nothing for non-arrays', () => {
    expect(parseTasks({ tasks: [] })).toEqual({ tasks: [], skipped: 0 });
  });
});

describe('storage', () => {
  const v1 = [{ id: '1', text: 'Old task', priority: 'high', due: null, done: true, createdAt: 7 }];

  it('round-trips tasks', () => {
    const store = memoryStore();
    const { tasks } = parseTasks(v1);
    expect(saveTasks(store, tasks)).toBe(true);
    expect(loadTasks(store)).toEqual(tasks);
  });

  it('migrates version-1 data once and removes the old key', () => {
    const store = memoryStore({ [LEGACY_KEY]: JSON.stringify(v1) });
    expect(loadTasks(store)).toEqual(v1);
    expect(store.data.has(LEGACY_KEY)).toBe(false);
    expect(JSON.parse(store.data.get(STORAGE_KEY)!)).toEqual({ version: 2, tasks: v1 });
  });

  it('prefers version-2 data when both exist', () => {
    const store = memoryStore({
      [LEGACY_KEY]: JSON.stringify(v1),
      [STORAGE_KEY]: JSON.stringify({ version: 2, tasks: [] }),
    });
    expect(loadTasks(store)).toEqual([]);
  });

  it('survives corrupted JSON', () => {
    expect(loadTasks(memoryStore({ [STORAGE_KEY]: '{not json' }))).toEqual([]);
  });

  it('reports when the browser refuses to save', () => {
    const full = {
      ...memoryStore(),
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    };
    expect(saveTasks(full, [])).toBe(false);
  });
});
