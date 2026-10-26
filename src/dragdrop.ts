// Drag-to-reorder using Pointer Events, so the same code handles mouse, touch
// and pen. (The HTML5 drag-and-drop API used before does not work on phones.)

export interface DropTarget {
  targetId: string;
  position: 'before' | 'after';
}

/** Which item the pointer is over, and which half of it. Exported for tests. */
export function dropTargetAt(
  y: number,
  items: readonly { id: string; top: number; bottom: number }[],
  draggedId: string,
): DropTarget | null {
  const others = items.filter((i) => i.id !== draggedId);
  if (!others.length) return null;
  for (const item of others) {
    const mid = (item.top + item.bottom) / 2;
    if (y < mid) return { targetId: item.id, position: 'before' };
  }
  const last = others[others.length - 1];
  return last ? { targetId: last.id, position: 'after' } : null;
}

const DRAG_THRESHOLD = 4; // px of movement before a press becomes a drag
const EDGE = 60; // px from the viewport edge where the page auto-scrolls

export function enableDragReorder(
  list: HTMLElement,
  onDrop: (id: string, target: DropTarget) => void,
): void {
  list.addEventListener('pointerdown', (down) => {
    const handle = (down.target as Element).closest<HTMLElement>('.drag-handle');
    const item = handle?.closest<HTMLElement>('.task-item');
    if (!handle || !item?.dataset.id || down.button !== 0) return;

    const id = item.dataset.id;
    const startY = down.clientY;
    const startScroll = window.scrollY;
    let dragging = false;
    let target: DropTarget | null = null;
    let lastY = startY;
    let scrollTimer = 0;

    handle.setPointerCapture(down.pointerId);
    down.preventDefault();

    const siblings = (): HTMLElement[] =>
      [...list.querySelectorAll<HTMLElement>('.task-item')].filter((el) => el !== item);

    const clearMarkers = (): void => {
      list.querySelectorAll('.drop-before, .drop-after').forEach((el) => {
        el.classList.remove('drop-before', 'drop-after');
      });
    };

    const update = (clientY: number): void => {
      lastY = clientY;
      const offset = clientY - startY + (window.scrollY - startScroll);
      item.style.transform = `translateY(${offset}px)`;
      const rects = siblings().map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset.id ?? '', top: r.top, bottom: r.bottom, el };
      });
      target = dropTargetAt(clientY, rects, id);
      clearMarkers();
      if (target) {
        const t = target;
        rects
          .find((r) => r.id === t.targetId)
          ?.el.classList.add(t.position === 'before' ? 'drop-before' : 'drop-after');
      }
    };

    const autoScroll = (): void => {
      const dy = lastY < EDGE ? -8 : lastY > window.innerHeight - EDGE ? 8 : 0;
      if (dy) {
        window.scrollBy(0, dy);
        update(lastY);
      }
      scrollTimer = requestAnimationFrame(autoScroll);
    };

    const move = (e: PointerEvent): void => {
      if (!dragging) {
        if (Math.abs(e.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
        item.classList.add('dragging');
        scrollTimer = requestAnimationFrame(autoScroll);
      }
      update(e.clientY);
    };

    const finish = (commit: boolean): void => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', cancel);
      cancelAnimationFrame(scrollTimer);
      clearMarkers();
      item.classList.remove('dragging');
      item.style.transform = '';
      if (commit && dragging && target) onDrop(id, target);
    };
    const up = (): void => {
      finish(true);
    };
    const cancel = (): void => {
      finish(false);
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', cancel);
  });
}
