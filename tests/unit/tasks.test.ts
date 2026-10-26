import { describe, expect, it } from 'vitest';
import {
  addTask,
  cleanText,
  createTask,
  editTask,
  moveByStep,
  moveTask,
  removeCompleted,
  removeTask,
  restoreAll,
  restoreTask,
  stats,
  toggleTask,
} from '../../src/tasks';
import type { Task } from '../../src/types';

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  text: `Task ${id}`,
  priority: 'low',
  due: null,
  done: false,
  createdAt: 0,
  ...extra,
});
const ids = (list: Task[]) => list.map((t) => t.id);

describe('createTask', () => {
  it('trims and collapses whitespace', () => {
    expect(createTask({ text: '  buy   milk ', priority: 'high', due: null }, 'x', 5)).toEqual({
      id: 'x',
      text: 'buy milk',
      priority: 'high',
      due: null,
      done: false,
      createdAt: 5,
    });
  });

  it('rejects blank text', () => {
    expect(createTask({ text: '   ', priority: 'low', due: null })).toBeNull();
  });

  it('caps very long text', () => {
    expect(cleanText('a'.repeat(900))).toHaveLength(500);
  });
});

describe('list operations', () => {
  const list = [task('a'), task('b'), task('c')];

  it('adds new tasks to the top without mutating the input', () => {
    const next = addTask(list, task('z'));
    expect(ids(next)).toEqual(['z', 'a', 'b', 'c']);
    expect(ids(list)).toEqual(['a', 'b', 'c']);
  });

  it('toggles only the matching task', () => {
    const next = toggleTask(list, 'b');
    expect(next.map((t) => t.done)).toEqual([false, true, false]);
    expect(toggleTask(next, 'b')[1]?.done).toBe(false);
  });

  it('edits text but ignores blank edits', () => {
    expect(editTask(list, 'a', '  new  text ')[0]?.text).toBe('new text');
    expect(editTask(list, 'a', '   ')[0]?.text).toBe('Task a');
  });

  it('removes and restores a task in its original position', () => {
    const { tasks, removed } = removeTask(list, 'b');
    expect(ids(tasks)).toEqual(['a', 'c']);
    expect(removed).toEqual({ task: list[1], index: 1 });
    expect(ids(restoreTask(tasks, removed!))).toEqual(['a', 'b', 'c']);
  });

  it('keeps later changes when undoing a delete', () => {
    const { tasks, removed } = removeTask(list, 'a');
    const toggled = toggleTask(tasks, 'c');
    const restored = restoreTask(toggled, removed!);
    expect(ids(restored)).toEqual(['a', 'b', 'c']);
    expect(restored[2]?.done).toBe(true);
  });

  it('does not restore the same task twice', () => {
    const { removed } = removeTask(list, 'a');
    expect(ids(restoreTask(list, removed!))).toEqual(['a', 'b', 'c']);
  });

  it('removing an unknown id changes nothing', () => {
    expect(removeTask(list, 'nope')).toEqual({ tasks: list, removed: null });
  });

  it('clears completed tasks and undoes the clear in order', () => {
    const mixed = [task('a', { done: true }), task('b'), task('c', { done: true }), task('d')];
    const { tasks, removed } = removeCompleted(mixed);
    expect(ids(tasks)).toEqual(['b', 'd']);
    expect(ids(restoreAll(tasks, removed))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('reordering', () => {
  const list = [task('a'), task('b'), task('c'), task('d')];

  it('moves before or after a target', () => {
    expect(ids(moveTask(list, 'd', 'a', 'before'))).toEqual(['d', 'a', 'b', 'c']);
    expect(ids(moveTask(list, 'a', 'c', 'after'))).toEqual(['b', 'c', 'a', 'd']);
  });

  it('ignores moves onto itself or unknown ids', () => {
    expect(ids(moveTask(list, 'a', 'a', 'after'))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(moveTask(list, 'a', 'zz', 'after'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('steps past hidden tasks when a filter is active', () => {
    // Only a and d are visible; moving d up should place it just before a.
    expect(ids(moveByStep(list, 'd', -1, ['a', 'd']))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('does nothing at the ends of the list', () => {
    expect(ids(moveByStep(list, 'a', -1, ['a', 'b', 'c', 'd']))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(moveByStep(list, 'd', 1, ['a', 'b', 'c', 'd']))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('stats', () => {
  it('counts and rounds the percentage', () => {
    expect(stats([task('a', { done: true }), task('b'), task('c')])).toEqual({
      total: 3,
      done: 1,
      pending: 2,
      percent: 33,
    });
  });

  it('is zero for an empty list', () => {
    expect(stats([])).toEqual({ total: 0, done: 0, pending: 0, percent: 0 });
  });
});
