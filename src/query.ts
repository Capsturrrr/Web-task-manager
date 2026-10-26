import type { Priority, Task, ViewOptions } from './types';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function matchesFilter(task: Task, filter: ViewOptions['filter']): boolean {
  switch (filter) {
    case 'pending':
      return !task.done;
    case 'completed':
      return task.done;
    case 'high':
      return task.priority === 'high';
    case 'all':
      return true;
  }
}

function compare(a: Task, b: Task, sort: ViewOptions['sort']): number {
  switch (sort) {
    case 'due':
      // Tasks with no due date go last.
      if (a.due === b.due) return 0;
      if (a.due === null) return 1;
      if (b.due === null) return -1;
      return a.due < b.due ? -1 : 1;
    case 'priority':
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case 'created':
      return b.createdAt - a.createdAt;
    case 'manual':
      return 0;
  }
}

/** The tasks to show, in display order. Array.prototype.sort is stable, so ties keep manual order. */
export function visibleTasks(tasks: readonly Task[], options: ViewOptions): Task[] {
  const needle = options.search.trim().toLocaleLowerCase();
  return tasks
    .filter((t) => matchesFilter(t, options.filter))
    .filter((t) => !needle || t.text.toLocaleLowerCase().includes(needle))
    .sort((a, b) => compare(a, b, options.sort));
}

/** Drag and keyboard reordering only make sense when the list shows the stored order. */
export function canReorder(options: ViewOptions): boolean {
  return options.sort === 'manual';
}
