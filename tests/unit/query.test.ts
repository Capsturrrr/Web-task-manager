import { describe, expect, it } from 'vitest';
import { canReorder, visibleTasks } from '../../src/query';
import type { Task, ViewOptions } from '../../src/types';

const tasks: Task[] = [
  { id: 'a', text: 'Write report', priority: 'low', due: '2026-11-05', done: false, createdAt: 1 },
  { id: 'b', text: 'Call vendor', priority: 'high', due: null, done: true, createdAt: 3 },
  {
    id: 'c',
    text: 'Review REPORT draft',
    priority: 'medium',
    due: '2026-11-01',
    done: false,
    createdAt: 2,
  },
  { id: 'd', text: 'Book train', priority: 'high', due: '2026-11-01', done: false, createdAt: 4 },
];
const view = (o: Partial<ViewOptions> = {}): ViewOptions => ({
  filter: 'all',
  search: '',
  sort: 'manual',
  ...o,
});
const ids = (o: Partial<ViewOptions>) => visibleTasks(tasks, view(o)).map((t) => t.id);

describe('visibleTasks', () => {
  it('keeps stored order by default', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters', () => {
    expect(ids({ filter: 'pending' })).toEqual(['a', 'c', 'd']);
    expect(ids({ filter: 'completed' })).toEqual(['b']);
    expect(ids({ filter: 'high' })).toEqual(['b', 'd']);
  });

  it('searches case-insensitively and ignores surrounding spaces', () => {
    expect(ids({ search: '  report ' })).toEqual(['a', 'c']);
  });

  it('combines search and filter', () => {
    expect(ids({ search: 'report', filter: 'completed' })).toEqual([]);
  });

  it('sorts by due date with undated tasks last, keeping ties in manual order', () => {
    expect(ids({ sort: 'due' })).toEqual(['c', 'd', 'a', 'b']);
  });

  it('sorts by priority, high first', () => {
    expect(ids({ sort: 'priority' })).toEqual(['b', 'd', 'c', 'a']);
  });

  it('sorts newest first', () => {
    expect(ids({ sort: 'created' })).toEqual(['d', 'b', 'c', 'a']);
  });

  it('does not reorder the stored list', () => {
    visibleTasks(tasks, view({ sort: 'priority' }));
    expect(tasks.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('canReorder', () => {
  it('only allows reordering in manual order', () => {
    expect(canReorder(view())).toBe(true);
    expect(canReorder(view({ filter: 'pending' }))).toBe(true);
    expect(canReorder(view({ sort: 'due' }))).toBe(false);
  });
});
