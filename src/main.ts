import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import './styles.css';

import { registerSW } from 'virtual:pwa-register';
import { backupFileName, exportTasks, ImportError, importTasks } from './backup';
import { enableDragReorder } from './dragdrop';
import { toISODate } from './dates';
import { canReorder, visibleTasks } from './query';
import { browserStore, loadTasks, saveTasks, STORAGE_KEY } from './storage';
import {
  addTask,
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
} from './tasks';
import { applyTheme, loadTheme, nextTheme, saveTheme, type Theme } from './theme';
import {
  FILTERS,
  PRIORITIES,
  SORTS,
  type Filter,
  type Priority,
  type SortKey,
  type Task,
  type ViewOptions,
} from './types';
import { emptyMessage, renderList, renderStats } from './view';

// ---------- elements ----------

/** Looks up an element and checks its type, so a renamed id fails loudly at startup. */
function $<T extends HTMLElement>(id: string, type: new () => T): T;
function $(id: string): HTMLElement;
function $(id: string, type: new () => HTMLElement = HTMLElement): HTMLElement {
  const node = document.getElementById(id);
  if (!(node instanceof type)) throw new Error(`Missing or wrong element #${id} in index.html`);
  return node;
}

const els = {
  form: $('addForm', HTMLFormElement),
  input: $('taskInput', HTMLInputElement),
  due: $('dueDateInput', HTMLInputElement),
  list: $('taskList'),
  search: $('searchInput', HTMLInputElement),
  sort: $('sortSelect', HTMLSelectElement),
  date: $('dateDisplay'),
  theme: $('themeToggle', HTMLButtonElement),
  themeIcon: $('themeIcon'),
  clearDone: $('clearDone', HTMLButtonElement),
  exportBtn: $('exportBtn', HTMLButtonElement),
  importBtn: $('importBtn', HTMLButtonElement),
  importFile: $('importFile', HTMLInputElement),
  toast: $('toast'),
  toastText: $('toastText'),
  toastAction: $('toastAction', HTMLButtonElement),
  announcer: $('announcer'),
  stats: {
    total: $('statTotal'),
    pending: $('statPending'),
    done: $('statDone'),
    bar: $('progressBar'),
    fill: $('progressFill'),
    label: $('progressLabel'),
  },
  priorityBtns: [...document.querySelectorAll<HTMLButtonElement>('.priority-btn')],
  filterBtns: [...document.querySelectorAll<HTMLButtonElement>('.filter-btn')],
};

// ---------- state ----------

const store = browserStore();
let tasks: Task[] = loadTasks(store);
const view: ViewOptions = { filter: 'all', search: '', sort: 'manual' };
let priority: Priority = 'low';
let theme: Theme = loadTheme(store);
let newTaskId: string | null = null;
let editingId: string | null = null;
let focusAfterRender: string | null = null;
let undo: (() => void) | null = null;
let toastTimer = 0;

const today = (): string => toISODate(new Date());

// ---------- feedback ----------

function announce(message: string): void {
  // Clearing first makes screen readers repeat identical messages.
  els.announcer.textContent = '';
  requestAnimationFrame(() => (els.announcer.textContent = message));
}

function showToast(message: string, action?: () => void): void {
  window.clearTimeout(toastTimer);
  els.toastText.textContent = message;
  undo = action ?? null;
  els.toastAction.hidden = !action;
  els.toast.hidden = false;
  toastTimer = window.setTimeout(hideToast, action ? 7000 : 4000);
}

function hideToast(): void {
  els.toast.hidden = true;
  undo = null;
}

function runUndo(): void {
  if (!undo) return;
  const action = undo;
  hideToast();
  action();
}

// ---------- state changes ----------

function commit(next: Task[]): void {
  tasks = next;
  if (!saveTasks(store, tasks)) {
    showToast('Could not save. Your browser storage may be full or blocked.');
  }
  render();
}

function render(): void {
  const shown = visibleTasks(tasks, view);
  renderList(els.list, shown, {
    today: today(),
    reorderable: canReorder(view),
    newId: newTaskId,
    editingId,
    empty: emptyMessage(tasks.length, view.filter, view.search),
  });
  renderStats(els.stats, stats(tasks));
  els.clearDone.disabled = !tasks.some((t) => t.done);
  els.exportBtn.disabled = !tasks.length;
  newTaskId = null;

  if (focusAfterRender) {
    const target = els.list.querySelector<HTMLElement>(
      `[data-focus="${CSS.escape(focusAfterRender)}"]`,
    );
    focusAfterRender = null;
    if (target) {
      target.focus();
      if (target instanceof HTMLInputElement) target.select();
    }
  }
}

function add(): void {
  const task = createTask({ text: els.input.value, priority, due: els.due.value || null });
  if (!task) {
    els.input.focus();
    announce('Type a task first.');
    return;
  }
  newTaskId = task.id;
  els.input.value = '';
  els.due.value = '';
  commit(addTask(tasks, task));
  announce(`Added "${task.text}".`);
  if (!visibleTasks([task], view).length) {
    showToast('Task added. It is hidden by the current filter or search.');
  }
}

function toggle(id: string): void {
  const before = tasks.find((t) => t.id === id);
  focusAfterRender = `check:${id}`;
  commit(toggleTask(tasks, id));
  if (before) announce(`${before.text}: ${before.done ? 'not done' : 'done'}.`);
}

function remove(id: string): void {
  const { tasks: next, removed } = removeTask(tasks, id);
  if (!removed) return;
  // Keep keyboard focus nearby instead of losing it with the deleted item.
  const shown = visibleTasks(tasks, view).map((t) => t.id);
  const at = shown.indexOf(id);
  const neighbour = shown[at + 1] ?? shown[at - 1];
  focusAfterRender = neighbour ? `check:${neighbour}` : null;
  commit(next);
  if (!neighbour) els.input.focus();
  showToast(`Deleted "${removed.task.text}".`, () => {
    focusAfterRender = `check:${removed.task.id}`;
    commit(restoreTask(tasks, removed));
    announce('Task restored.');
  });
}

function startEdit(id: string): void {
  editingId = id;
  focusAfterRender = `editing:${id}`;
  render();
}

function finishEdit(save: boolean): void {
  if (!editingId) return;
  const id = editingId;
  const input = els.list.querySelector<HTMLInputElement>('.task-edit');
  editingId = null;
  focusAfterRender = `edit:${id}`;
  if (save && input) commit(editTask(tasks, id, input.value));
  else render();
}

function setFilter(filter: Filter): void {
  view.filter = filter;
  for (const btn of els.filterBtns) {
    const on = btn.dataset.filter === filter;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
  render();
}

function setPriority(next: Priority, focus = false): void {
  priority = next;
  for (const btn of els.priorityBtns) {
    const on = btn.dataset.priority === next;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', String(on));
    btn.tabIndex = on ? 0 : -1;
    if (on && focus) btn.focus();
  }
}

const SVG_START =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
// Static markup only; no user data is ever inserted into these strings.
const THEME_ICON: Record<Theme, string> = {
  system: `${SVG_START}<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`,
  light: `${SVG_START}<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  dark: `${SVG_START}<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
};

function setTheme(next: Theme): void {
  theme = next;
  applyTheme(document.documentElement, theme);
  saveTheme(store, theme);
  els.themeIcon.innerHTML = THEME_ICON[theme];
  els.theme.setAttribute('aria-label', `Theme: ${theme}. Switch to ${nextTheme(theme)}.`);
  els.theme.title = `Theme: ${theme}`;
}

function exportBackup(): void {
  const blob = new Blob([exportTasks(tasks)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: backupFileName() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  announce(`Exported ${tasks.length} tasks.`);
}

async function importBackup(file: File): Promise<void> {
  try {
    const result = importTasks(tasks, await file.text());
    // importTasks appends new tasks after the existing ones.
    const addedIds = new Set(result.tasks.slice(tasks.length).map((t) => t.id));
    commit(result.tasks);
    const parts = [`Imported ${result.added} task${result.added === 1 ? '' : 's'}`];
    if (result.duplicates) parts.push(`${result.duplicates} already here`);
    if (result.invalid) parts.push(`${result.invalid} unreadable`);
    const undoImport = (): void => {
      commit(tasks.filter((t) => !addedIds.has(t.id)));
      announce('Import undone.');
    };
    showToast(`${parts.join(', ')}.`, result.added ? undoImport : undefined);
  } catch (error) {
    showToast(error instanceof ImportError ? error.message : 'Could not read that file.');
  }
}

// ---------- events ----------

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  add();
});

els.priorityBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setPriority(btn.dataset.priority as Priority);
  });
});
// Radio-group keyboard pattern: arrows move between priorities.
els.priorityBtns[0]?.parentElement?.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const i = PRIORITIES.indexOf(priority);
  setPriority(PRIORITIES[(i + step + PRIORITIES.length) % PRIORITIES.length] ?? 'low', true);
});

els.filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.filter as Filter;
    if (FILTERS.includes(f)) setFilter(f);
  });
});

els.search.addEventListener('input', () => {
  view.search = els.search.value;
  render();
});
els.search.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && els.search.value) {
    els.search.value = '';
    view.search = '';
    render();
  }
});

els.sort.addEventListener('change', () => {
  const s = els.sort.value as SortKey;
  if (SORTS.includes(s)) view.sort = s;
  render();
});

els.list.addEventListener('click', (e) => {
  const button = (e.target as Element).closest<HTMLElement>('[data-action]');
  const id = button?.closest<HTMLElement>('.task-item')?.dataset.id;
  if (!button || !id) return;
  switch (button.dataset.action) {
    case 'toggle':
      toggle(id);
      break;
    case 'edit':
      startEdit(id);
      break;
    case 'delete':
      remove(id);
      break;
  }
});

els.list.addEventListener('dblclick', (e) => {
  const text = (e.target as Element).closest('.task-text');
  const id = text?.closest<HTMLElement>('.task-item')?.dataset.id;
  if (id) startEdit(id);
});

els.list.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('task-edit')) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      // Without this, the same key press also activates the Edit button that
      // receives focus after saving, which reopens the editor.
      e.preventDefault();
      finishEdit(e.key === 'Enter');
    }
    return;
  }
  if (target.classList.contains('drag-handle') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const id = target.closest<HTMLElement>('.task-item')?.dataset.id;
    if (!id || !canReorder(view)) return;
    const shown = visibleTasks(tasks, view).map((t) => t.id);
    const step = e.key === 'ArrowUp' ? -1 : 1;
    const next = moveByStep(tasks, id, step, shown);
    if (next.some((t, i) => t.id !== tasks[i]?.id)) {
      focusAfterRender = `handle:${id}`;
      commit(next);
      const pos = visibleTasks(next, view).findIndex((t) => t.id === id) + 1;
      announce(`Moved to position ${pos} of ${shown.length}.`);
    }
  }
});

els.list.addEventListener('focusout', (e) => {
  if ((e.target as HTMLElement).classList.contains('task-edit')) finishEdit(true);
});

enableDragReorder(els.list, (id, { targetId, position }) => {
  if (!canReorder(view)) return;
  commit(moveTask(tasks, id, targetId, position));
  announce('Task moved.');
});

els.clearDone.addEventListener('click', () => {
  const { tasks: next, removed } = removeCompleted(tasks);
  if (!removed.length) return;
  commit(next);
  showToast(`Cleared ${removed.length} completed task${removed.length === 1 ? '' : 's'}.`, () => {
    commit(restoreAll(tasks, removed));
    announce('Completed tasks restored.');
  });
});

els.exportBtn.addEventListener('click', exportBackup);
els.importBtn.addEventListener('click', () => {
  els.importFile.click();
});
els.importFile.addEventListener('change', () => {
  const file = els.importFile.files?.[0];
  els.importFile.value = '';
  if (file) void importBackup(file);
});

els.toastAction.addEventListener('click', runUndo);
els.theme.addEventListener('click', () => {
  setTheme(nextTheme(theme));
});

// Global shortcuts, ignored while typing in a field.
document.addEventListener('keydown', (e) => {
  const typing = (e.target as Element).closest('input, select, textarea, [contenteditable]');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && undo) {
    e.preventDefault();
    runUndo();
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') {
    e.preventDefault();
    els.search.focus();
  } else if (e.key === 'n') {
    e.preventDefault();
    els.input.focus();
  }
});

// Another tab changed the tasks: show the same list here.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    tasks = loadTasks(store);
    render();
  }
});

// ---------- start ----------

els.date.textContent = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
els.due.min = today();
setTheme(theme);
setPriority('low');
render();

// Offline support: caches the app on first visit and updates it quietly.
registerSW({ immediate: true });
