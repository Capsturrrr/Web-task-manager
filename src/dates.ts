import type { Task } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD for the given moment in the user's local time zone. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return toISODate(new Date(y, m - 1, d + days));
}

export function isOverdue(task: Pick<Task, 'done' | 'due'>, today: string): boolean {
  return !task.done && task.due !== null && task.due < today;
}

/** "Today", "Tomorrow", "Yesterday", or a short date such as "15 Jan". */
export function formatDue(iso: string, today: string, locale?: string): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
