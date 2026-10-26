// Smart Task Manager
// Tasks live in localStorage, so they survive a refresh. Every change goes
// through save() and then render(), which rebuilds the list from `tasks`.

const STORAGE_KEY = 'stm.tasks.v1';
const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

const el = {
  input: document.getElementById('taskInput'),
  due: document.getElementById('dueDateInput'),
  add: document.getElementById('addTask'),
  list: document.getElementById('taskList'),
  date: document.getElementById('dateDisplay'),
  total: document.getElementById('statTotal'),
  pending: document.getElementById('statPending'),
  done: document.getElementById('statDone'),
  fill: document.getElementById('progressFill'),
  progress: document.getElementById('progressLabel'),
  priorityBtns: document.querySelectorAll('.priority-btn'),
  filterBtns: document.querySelectorAll('.filter-btn'),
};

let tasks = load();
let priority = 'low';
let filter = 'all';
let dragId = null;

// ---------- storage ----------

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // private mode or corrupted data: start empty rather than crash
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // storage full or blocked: the app keeps working for this session
  }
}

// ---------- dates ----------

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function isOverdue(task) {
  return !task.done && task.due && task.due < todayISO();
}

function formatDue(iso) {
  const today = todayISO();
  if (iso === today) return 'Today';
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowISO = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (iso === tomorrowISO) return 'Tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ---------- actions ----------

function addTask() {
  const text = el.input.value.trim();
  if (!text) {
    el.input.focus();
    return;
  }
  tasks.unshift({
    id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random()),
    text,
    priority,
    due: el.due.value || null,
    done: false,
    createdAt: Date.now(),
  });
  el.input.value = '';
  el.due.value = '';
  save();
  render();
  el.input.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  save();
  render();
}

function deleteTask(id, itemEl) {
  itemEl.classList.add('removing');
  itemEl.addEventListener('animationend', () => {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }, { once: true });
}

function startEdit(id, itemEl) {
  const task = tasks.find(t => t.id === id);
  const textEl = itemEl.querySelector('.task-text');
  if (!task || !textEl) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-edit';
  input.value = task.text;
  input.setAttribute('aria-label', 'Edit task');
  textEl.replaceWith(input);
  itemEl.draggable = false;
  input.focus();
  input.select();

  let finished = false;
  const finish = (keep) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (keep && value) {
      task.text = value;
      save();
    }
    render();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ---------- rendering ----------

function visibleTasks() {
  switch (filter) {
    case 'pending': return tasks.filter(t => !t.done);
    case 'completed': return tasks.filter(t => t.done);
    case 'high': return tasks.filter(t => t.priority === 'high');
    default: return tasks;
  }
}

function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  el.total.textContent = total;
  el.pending.textContent = total - done;
  el.done.textContent = done;
  el.fill.style.width = pct + '%';
  el.progress.textContent = pct + '% complete';
}

function emptyMessage() {
  if (!tasks.length) return ['✦', 'No tasks yet. Add your first one above.'];
  if (filter === 'completed') return ['○', 'Nothing completed yet.'];
  if (filter === 'pending') return ['✓', 'All caught up. Nice work.'];
  if (filter === 'high') return ['◎', 'No high-priority tasks.'];
  return ['✦', 'Nothing here.'];
}

function taskItem(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.done ? ' completed' : '');
  li.dataset.priority = task.priority;
  li.dataset.id = task.id;
  li.draggable = true;

  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.setAttribute('aria-hidden', 'true');
  handle.innerHTML = '<span></span><span></span><span></span>';

  const check = document.createElement('button');
  check.className = 'task-check' + (task.done ? ' checked' : '');
  check.setAttribute('aria-label', task.done ? 'Mark as not done' : 'Mark as done');
  check.addEventListener('click', () => toggleTask(task.id));

  const body = document.createElement('div');
  body.className = 'task-body';

  const text = document.createElement('div');
  text.className = 'task-text';
  text.textContent = task.text; // textContent, never innerHTML: task text is user input
  text.addEventListener('dblclick', () => startEdit(task.id, li));

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const badge = document.createElement('span');
  badge.className = `task-priority-badge badge-${task.priority}`;
  badge.textContent = PRIORITY_LABEL[task.priority] || task.priority;
  meta.append(badge);

  if (task.due) {
    const due = document.createElement('span');
    const overdue = isOverdue(task);
    due.className = 'task-due' + (overdue ? ' overdue' : '');
    due.textContent = (overdue ? 'Overdue · ' : 'Due ') + formatDue(task.due);
    meta.append(due);
  }

  body.append(text, meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const edit = document.createElement('button');
  edit.className = 'action-btn';
  edit.setAttribute('aria-label', 'Edit task');
  edit.textContent = '✎';
  edit.addEventListener('click', () => startEdit(task.id, li));

  const del = document.createElement('button');
  del.className = 'action-btn delete-btn';
  del.setAttribute('aria-label', 'Delete task');
  del.textContent = '✕';
  del.addEventListener('click', () => deleteTask(task.id, li));

  actions.append(edit, del);
  li.append(handle, check, body, actions);
  return li;
}

function render() {
  renderStats();
  el.list.replaceChildren();

  const shown = visibleTasks();
  if (!shown.length) {
    const [icon, message] = emptyMessage();
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="empty-icon">${icon}</div><p></p>`;
    empty.querySelector('p').textContent = message;
    el.list.append(empty);
    return;
  }
  el.list.append(...shown.map(taskItem));
}

// ---------- drag to reorder ----------
// Reordering moves the dragged task next to the drop target in the full list,
// so it also works while a filter is active.

el.list.addEventListener('dragstart', e => {
  const item = e.target.closest('.task-item');
  if (!item) return;
  dragId = item.dataset.id;
  item.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
});

el.list.addEventListener('dragover', e => {
  const item = e.target.closest('.task-item');
  if (!item || item.dataset.id === dragId) return;
  e.preventDefault();
  el.list.querySelectorAll('.drag-over').forEach(n => n !== item && n.classList.remove('drag-over'));
  item.classList.add('drag-over');
});

el.list.addEventListener('dragleave', e => {
  const item = e.target.closest('.task-item');
  if (item && !item.contains(e.relatedTarget)) item.classList.remove('drag-over');
});

el.list.addEventListener('drop', e => {
  e.preventDefault();
  const target = e.target.closest('.task-item');
  if (!target || !dragId || target.dataset.id === dragId) return;
  const from = tasks.findIndex(t => t.id === dragId);
  const [moved] = tasks.splice(from, 1);
  const to = tasks.findIndex(t => t.id === target.dataset.id);
  const rect = target.getBoundingClientRect();
  const after = e.clientY > rect.top + rect.height / 2;
  tasks.splice(after ? to + 1 : to, 0, moved);
  save();
  render();
});

el.list.addEventListener('dragend', () => {
  dragId = null;
  el.list.querySelectorAll('.dragging, .drag-over').forEach(n => n.classList.remove('dragging', 'drag-over'));
});

// ---------- controls ----------

el.add.addEventListener('click', addTask);
el.input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

el.priorityBtns.forEach(btn => btn.addEventListener('click', () => {
  priority = btn.dataset.priority;
  el.priorityBtns.forEach(b => b.classList.toggle('active', b === btn));
}));

el.filterBtns.forEach(btn => btn.addEventListener('click', () => {
  filter = btn.dataset.filter;
  el.filterBtns.forEach(b => b.classList.toggle('active', b === btn));
  render();
}));

// Keep tabs in sync if the app is open in more than one.
window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY) {
    tasks = load();
    render();
  }
});

el.date.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
el.due.min = todayISO();
render();
