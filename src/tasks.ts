// Every operation on the task list. All functions are pure: they return a new
// array and never mutate their input, which keeps undo and testing simple.
import { MAX_TEXT_LENGTH, type Priority, type Removed, type Task } from './types';

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);
}

export interface NewTask {
  text: string;
  priority: Priority;
  due: string | null;
}

/** Returns null when the text is blank, so callers can't add empty tasks. */
export function createTask(input: NewTask, id = newId(), now = Date.now()): Task | null {
  const text = cleanText(input.text);
  if (!text) return null;
  return { id, text, priority: input.priority, due: input.due, done: false, createdAt: now };
}

export function addTask(tasks: readonly Task[], task: Task): Task[] {
  return [task, ...tasks];
}

export function toggleTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

/** Blank edits are ignored rather than wiping the task. */
export function editTask(tasks: readonly Task[], id: string, text: string): Task[] {
  const clean = cleanText(text);
  if (!clean) return [...tasks];
  return tasks.map((t) => (t.id === id ? { ...t, text: clean } : t));
}

export function removeTask(
  tasks: readonly Task[],
  id: string,
): { tasks: Task[]; removed: Removed | null } {
  const index = tasks.findIndex((t) => t.id === id);
  const task = tasks[index];
  if (!task) return { tasks: [...tasks], removed: null };
  return { tasks: tasks.filter((t) => t.id !== id), removed: { task, index } };
}

/** Puts a removed task back where it was (or as close as the list now allows). */
export function restoreTask(tasks: readonly Task[], removed: Removed): Task[] {
  if (tasks.some((t) => t.id === removed.task.id)) return [...tasks];
  const next = [...tasks];
  next.splice(Math.min(removed.index, next.length), 0, removed.task);
  return next;
}

/** Removes every completed task, remembering positions so undo can restore them. */
export function removeCompleted(tasks: readonly Task[]): { tasks: Task[]; removed: Removed[] } {
  const removed: Removed[] = [];
  tasks.forEach((task, index) => {
    if (task.done) removed.push({ task, index });
  });
  return { tasks: tasks.filter((t) => !t.done), removed };
}

/** Undo for removeCompleted: reinserting in ascending index order restores the original order. */
export function restoreAll(tasks: readonly Task[], removed: readonly Removed[]): Task[] {
  return [...removed]
    .sort((a, b) => a.index - b.index)
    .reduce<Task[]>((list, r) => restoreTask(list, r), [...tasks]);
}

/** Moves `id` directly before or after `targetId`. */
export function moveTask(
  tasks: readonly Task[],
  id: string,
  targetId: string,
  position: 'before' | 'after',
): Task[] {
  if (id === targetId) return [...tasks];
  const moving = tasks.find((t) => t.id === id);
  if (!moving || !tasks.some((t) => t.id === targetId)) return [...tasks];
  const rest = tasks.filter((t) => t.id !== id);
  const at = rest.findIndex((t) => t.id === targetId) + (position === 'after' ? 1 : 0);
  rest.splice(at, 0, moving);
  return rest;
}

/**
 * Keyboard reordering: swaps `id` with its neighbour among `visibleIds`
 * (the tasks currently on screen), so it also works while a filter is active.
 */
export function moveByStep(
  tasks: readonly Task[],
  id: string,
  step: -1 | 1,
  visibleIds: readonly string[],
): Task[] {
  const at = visibleIds.indexOf(id);
  const neighbour = visibleIds[at + step];
  if (at === -1 || neighbour === undefined) return [...tasks];
  return moveTask(tasks, id, neighbour, step === -1 ? 'before' : 'after');
}

export interface Stats {
  total: number;
  done: number;
  pending: number;
  percent: number;
}

export function stats(tasks: readonly Task[]): Stats {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return {
    total,
    done,
    pending: total - done,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}
