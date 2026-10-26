import { describe, expect, it } from 'vitest';
import { backupFileName, exportTasks, ImportError, importTasks } from '../../src/backup';
import type { Task } from '../../src/types';

const t = (id: string): Task => ({
  id,
  text: `Task ${id}`,
  priority: 'medium',
  due: '2026-11-01',
  done: false,
  createdAt: 1,
});

describe('backup', () => {
  it('exports a versioned file that imports back unchanged', () => {
    const json = exportTasks([t('a'), t('b')], new Date('2026-10-26T10:00:00Z'));
    expect(JSON.parse(json)).toMatchObject({ app: 'smart-task-manager', version: 2 });
    expect(importTasks([], json)).toEqual({
      tasks: [t('a'), t('b')],
      added: 2,
      duplicates: 0,
      invalid: 0,
    });
  });

  it('merges without duplicating, so importing twice is harmless', () => {
    const json = exportTasks([t('a'), t('b')]);
    const result = importTasks([t('a')], json);
    expect(result.tasks.map((x) => x.id)).toEqual(['a', 'b']);
    expect(result).toMatchObject({ added: 1, duplicates: 1 });
  });

  it('accepts a bare array of tasks', () => {
    expect(importTasks([], JSON.stringify([t('a'), { nope: true }]))).toMatchObject({
      added: 1,
      invalid: 1,
    });
  });

  it('explains unreadable files', () => {
    expect(() => importTasks([], 'not json')).toThrow(ImportError);
    expect(() => importTasks([], '{"hello": 1}')).toThrow('No tasks were found');
  });

  it('names files by date', () => {
    expect(backupFileName(new Date('2026-10-26T10:00:00Z'))).toBe('tasks-2026-10-26.json');
  });
});
