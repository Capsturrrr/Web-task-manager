import { describe, expect, it } from 'vitest';
import { dropTargetAt } from '../../src/dragdrop';
import { applyTheme, loadTheme, nextTheme } from '../../src/theme';
import { emptyMessage, renderList } from '../../src/view';
import type { Task } from '../../src/types';

describe('dropTargetAt', () => {
  const items = [
    { id: 'a', top: 0, bottom: 100 },
    { id: 'b', top: 110, bottom: 210 },
    { id: 'c', top: 220, bottom: 320 },
  ];

  it('drops before the first item whose middle is below the pointer', () => {
    expect(dropTargetAt(30, items, 'c')).toEqual({ targetId: 'a', position: 'before' });
    expect(dropTargetAt(170, items, 'a')).toEqual({ targetId: 'c', position: 'before' });
  });

  it('drops after the last item when below everything', () => {
    expect(dropTargetAt(900, items, 'a')).toEqual({ targetId: 'c', position: 'after' });
  });

  it('ignores the dragged item itself', () => {
    expect(dropTargetAt(50, items, 'a')).toEqual({ targetId: 'b', position: 'before' });
    expect(dropTargetAt(50, [{ id: 'a', top: 0, bottom: 100 }], 'a')).toBeNull();
  });
});

describe('theme', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });

  it('falls back to system for missing or unknown values', () => {
    expect(loadTheme({ getItem: () => 'neon' })).toBe('system');
    expect(loadTheme({ getItem: () => 'dark' })).toBe('dark');
  });

  it('lets the media query decide when set to system', () => {
    const root = document.createElement('html');
    applyTheme(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
    applyTheme(root, 'system');
    expect(root.dataset.theme).toBeUndefined();
  });
});

describe('renderList', () => {
  const options = {
    today: '2026-10-26',
    reorderable: true,
    newId: null,
    editingId: null,
    empty: emptyMessage(0, 'all', ''),
  };

  it('never interprets task text as HTML', () => {
    const list = document.createElement('ul');
    const evil: Task = {
      id: 'x',
      text: '<img src=x onerror="alert(1)">',
      priority: 'high',
      due: '2026-10-20',
      done: false,
      createdAt: 0,
    };
    renderList(list, [evil], options);
    expect(list.querySelector('img')).toBeNull();
    expect(list.querySelector('.task-text')?.textContent).toBe(evil.text);
    expect(list.querySelector('.task-due')?.textContent).toMatch(/^Overdue/);
    expect(list.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('false');
  });

  it('shows a helpful empty state for searches', () => {
    expect(emptyMessage(3, 'all', ' milk ').message).toBe('No tasks match "milk".');
  });
});
