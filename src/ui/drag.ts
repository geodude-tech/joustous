/**
 * Pointer-event drag-and-drop for hand cards. Taps below the movement
 * threshold fall through to the normal click handlers, so tap-to-select
 * keeps working unchanged.
 */

const DRAG_THRESHOLD_PX = 8;

export interface DragHooks {
  canDrag(handIndex: number): boolean;
  /** Build the floating card element that follows the pointer. */
  makeGhost(handIndex: number): HTMLElement;
  /** Drag passed the threshold: select the card so legal tiles highlight. */
  onDragStart(handIndex: number): void;
  /** Drag finished; cell is the legal target under the pointer, if any. */
  onDragEnd(cell: { row: number; col: number } | null): void;
}

export function installDragDrop(root: HTMLElement, hooks: DragHooks): void {
  let pending: { pointerId: number; handIndex: number; x: number; y: number } | null = null;
  let active = false;
  let ghost: HTMLElement | null = null;
  let hovered: HTMLElement | null = null;

  function legalCellAt(x: number, y: number): HTMLElement | null {
    return (
      document.elementFromPoint(x, y)?.closest<HTMLElement>('.cell.legal-target') ?? null
    );
  }

  function moveGhost(e: PointerEvent): void {
    if (!ghost) return;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    const cell = legalCellAt(e.clientX, e.clientY);
    if (cell !== hovered) {
      hovered?.classList.remove('drop-hover');
      cell?.classList.add('drop-hover');
      hovered = cell;
    }
  }

  function finish(e: PointerEvent, cancelled: boolean): void {
    if (!pending || e.pointerId !== pending.pointerId) return;
    const wasActive = active;
    pending = null;
    active = false;
    ghost?.remove();
    ghost = null;
    hovered?.classList.remove('drop-hover');
    hovered = null;
    if (!wasActive) return; // plain tap: let the click handlers run
    suppressNextClick();
    const cell = cancelled ? null : legalCellAt(e.clientX, e.clientY);
    hooks.onDragEnd(
      cell ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) } : null,
    );
  }

  root.addEventListener('pointerdown', (e) => {
    if (pending) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-hand-index]');
    if (!card) return;
    const handIndex = Number(card.dataset.handIndex);
    if (!hooks.canDrag(handIndex)) return;
    // Touch implicitly captures the pointer on the card, which dies when the
    // drag-start re-render replaces it — release so document keeps the stream.
    if (card.hasPointerCapture?.(e.pointerId)) card.releasePointerCapture(e.pointerId);
    pending = { pointerId: e.pointerId, handIndex, x: e.clientX, y: e.clientY };
  });

  document.addEventListener('pointermove', (e) => {
    if (!pending || e.pointerId !== pending.pointerId) return;
    if (!active) {
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < DRAG_THRESHOLD_PX) return;
      active = true;
      ghost = hooks.makeGhost(pending.handIndex);
      document.body.appendChild(ghost);
      hooks.onDragStart(pending.handIndex);
    }
    moveGhost(e);
  });

  document.addEventListener('pointerup', (e) => finish(e, false));
  document.addEventListener('pointercancel', (e) => finish(e, true));
}

/** Eat the synthetic click that follows a real drag's pointerup. */
function suppressNextClick(): void {
  const eat = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
  };
  document.addEventListener('click', eat, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', eat, { capture: true }), 0);
}
