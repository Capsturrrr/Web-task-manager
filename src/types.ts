export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Task {
  id: string;
  text: string;
  priority: Priority;
  /** Local calendar date as YYYY-MM-DD, or null when there is no due date. */
  due: string | null;
  done: boolean;
  /** Milliseconds since the epoch. */
  createdAt: number;
}

export const FILTERS = ['all', 'pending', 'completed', 'high'] as const;
export type Filter = (typeof FILTERS)[number];

export const SORTS = ['manual', 'due', 'priority', 'created'] as const;
export type SortKey = (typeof SORTS)[number];

export interface ViewOptions {
  filter: Filter;
  search: string;
  sort: SortKey;
}

/** A deleted task and where it was, so it can be put back by undo. */
export interface Removed {
  task: Task;
  index: number;
}

export const MAX_TEXT_LENGTH = 500;
