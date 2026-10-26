// JSON export and import, so tasks can be backed up or moved to another browser.
import { parseTasks } from './schema';
import type { Task } from './types';

const APP_ID = 'smart-task-manager';

export function exportTasks(tasks: readonly Task[], now = new Date()): string {
  return JSON.stringify({ app: APP_ID, version: 2, exportedAt: now.toISOString(), tasks }, null, 2);
}

export function backupFileName(now = new Date()): string {
  return `tasks-${now.toISOString().slice(0, 10)}.json`;
}

export interface ImportResult {
  tasks: Task[];
  added: number;
  duplicates: number;
  invalid: number;
}

export class ImportError extends Error {}

/**
 * Merges a backup into the current list. Accepts this app's export format or a
 * bare array of tasks. Tasks whose id already exists are left alone, so
 * importing the same file twice changes nothing.
 */
export function importTasks(current: readonly Task[], fileText: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && 'tasks' in data
      ? data.tasks
      : null;
  if (!Array.isArray(list)) throw new ImportError('No tasks were found in that file.');

  const { tasks: incoming, skipped } = parseTasks(list);
  const existing = new Set(current.map((t) => t.id));
  const fresh = incoming.filter((t) => !existing.has(t.id));
  return {
    tasks: [...current, ...fresh],
    added: fresh.length,
    duplicates: incoming.length - fresh.length,
    invalid: skipped,
  };
}
