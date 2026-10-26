// Validates task data from untrusted places: localStorage (which other code or
// older versions may have written) and imported backup files.
import { isISODate } from './dates';
import { cleanText, newId } from './tasks';
import { PRIORITIES, type Priority, type Task } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTask(raw: unknown, now: number): Task | null {
  if (!isRecord(raw) || typeof raw.text !== 'string') return null;
  const text = cleanText(raw.text);
  if (!text) return null;
  const priority = PRIORITIES.includes(raw.priority as Priority)
    ? (raw.priority as Priority)
    : 'low';
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : newId(),
    text,
    priority,
    due: isISODate(raw.due) ? raw.due : null,
    done: raw.done === true,
    createdAt:
      typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : now,
  };
}

export interface ParseResult {
  tasks: Task[];
  /** Entries that could not be turned into a task. */
  skipped: number;
}

/** Keeps every valid task, repairs fixable fields, and drops duplicates by id. */
export function parseTasks(raw: unknown, now = Date.now()): ParseResult {
  if (!Array.isArray(raw)) return { tasks: [], skipped: 0 };
  const seen = new Set<string>();
  const tasks: Task[] = [];
  let skipped = 0;
  for (const item of raw) {
    const task = toTask(item, now);
    if (!task || seen.has(task.id)) {
      skipped++;
      continue;
    }
    seen.add(task.id);
    tasks.push(task);
  }
  return { tasks, skipped };
}
