// Turns state into DOM. Everything here reads state and writes elements; it
// never changes tasks itself (main.ts owns that).
import { formatDue, isOverdue } from './dates';
import type { Stats } from './tasks';
import type { Filter, Task } from './types';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' } as const;

export interface ListOptions {
  today: string;
  reorderable: boolean;
  /** Animate this task in (the one just added). */
  newId: string | null;
  /** Show this task's text as an input. */
  editingId: string | null;
  empty: { icon: string; message: string };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string>> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) node.setAttribute(key, value);
  }
  // textContent, never innerHTML: task text is user input
  if (text !== undefined) node.textContent = text;
  return node;
}

function taskItem(task: Task, options: ListOptions): HTMLLIElement {
  const overdue = isOverdue(task, options.today);
  const classes = ['task-item'];
  if (task.done) classes.push('completed');
  if (task.id === options.newId) classes.push('is-new');

  const li = el('li', {
    class: classes.join(' '),
    'data-id': task.id,
    'data-priority': task.priority,
  });

  const handle = el('button', {
    type: 'button',
    class: 'drag-handle',
    'data-focus': `handle:${task.id}`,
    'aria-label': `Move "${task.text}". Use the up and down arrow keys, or drag.`,
  });
  handle.append(el('span'), el('span'), el('span'));

  const check = el('button', {
    type: 'button',
    class: 'task-check',
    role: 'checkbox',
    'aria-checked': String(task.done),
    'aria-label': task.text,
    'data-action': 'toggle',
    'data-focus': `check:${task.id}`,
  });

  const body = el('div', { class: 'task-body' });
  if (task.id === options.editingId) {
    body.append(
      el('input', {
        type: 'text',
        class: 'task-edit',
        value: task.text,
        maxlength: '500',
        'aria-label': 'Edit task. Enter to save, Escape to cancel.',
        'data-focus': `editing:${task.id}`,
      }),
    );
  } else {
    body.append(el('div', { class: 'task-text' }, task.text));
  }

  const meta = el('div', { class: 'task-meta' });
  meta.append(
    el(
      'span',
      { class: `task-priority-badge badge-${task.priority}` },
      PRIORITY_LABEL[task.priority],
    ),
  );
  if (task.due) {
    const label = formatDue(task.due, options.today);
    meta.append(
      el(
        'span',
        { class: overdue ? 'task-due overdue' : 'task-due' },
        overdue ? `Overdue · ${label}` : `Due ${label}`,
      ),
    );
  }
  body.append(meta);

  const actions = el('div', { class: 'task-actions' });
  actions.append(
    el(
      'button',
      {
        type: 'button',
        class: 'action-btn',
        'data-action': 'edit',
        'data-focus': `edit:${task.id}`,
        'aria-label': `Edit "${task.text}"`,
      },
      '✎',
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'action-btn delete-btn',
        'data-action': 'delete',
        'aria-label': `Delete "${task.text}"`,
      },
      '✕',
    ),
  );

  li.append(handle, check, body, actions);
  return li;
}

export function renderList(list: HTMLElement, tasks: readonly Task[], options: ListOptions): void {
  list.dataset.reorderable = String(options.reorderable);
  if (!tasks.length) {
    const empty = el('li', { class: 'empty-state' });
    empty.append(
      el('div', { class: 'empty-icon', 'aria-hidden': 'true' }, options.empty.icon),
      el('p', {}, options.empty.message),
    );
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...tasks.map((t) => taskItem(t, options)));
}

export function emptyMessage(
  total: number,
  filter: Filter,
  search: string,
): { icon: string; message: string } {
  if (!total) return { icon: '✦', message: 'No tasks yet. Add your first one above.' };
  if (search.trim()) return { icon: '⌕', message: `No tasks match "${search.trim()}".` };
  switch (filter) {
    case 'completed':
      return { icon: '○', message: 'Nothing completed yet.' };
    case 'pending':
      return { icon: '✓', message: 'All caught up. Nice work.' };
    case 'high':
      return { icon: '◎', message: 'No high-priority tasks.' };
    case 'all':
      return { icon: '✦', message: 'Nothing here.' };
  }
}

export interface StatsElements {
  total: HTMLElement;
  pending: HTMLElement;
  done: HTMLElement;
  bar: HTMLElement;
  fill: HTMLElement;
  label: HTMLElement;
}

export function renderStats(els: StatsElements, s: Stats): void {
  els.total.textContent = String(s.total);
  els.pending.textContent = String(s.pending);
  els.done.textContent = String(s.done);
  els.fill.style.width = `${s.percent}%`;
  els.label.textContent = `${s.percent}% complete`;
  els.bar.setAttribute('aria-valuenow', String(s.percent));
  els.bar.setAttribute('aria-valuetext', `${s.done} of ${s.total} tasks done`);
}
