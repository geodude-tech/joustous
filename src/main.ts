import './ui/style.css';
import type { Direction, GameState, Move } from './engine/types';
import type { Pack } from './engine/cards';
import { newGame } from './engine/board';
import { legalMoves, applyMove } from './engine/rules';
import { checkEnd } from './engine/game';
import { chooseMove } from './engine/ai';
import { render, type UiState } from './ui/render';

const root = document.getElementById('app')!;

let state: GameState;
let ui: UiState;

function showPackSelect(): void {
  state = newGame();
  ui = { selectedHandIndex: null, pendingPush: null, message: null, aiCell: null, packSelect: true, showRules: false };
  draw();
}

function start(pack: Pack): void {
  state = newGame(Math.random, pack);
  ui = { selectedHandIndex: null, pendingPush: null, message: null, aiCell: null, packSelect: false, showRules: false };
  state.result = checkEnd(state);
  draw();
  maybeAiTurn();
}

function movesForSelection(): Move[] {
  if (state.result || state.turn !== 'blue' || ui.selectedHandIndex === null) return [];
  return legalMoves(state).filter((m) => m.handIndex === ui.selectedHandIndex);
}

function draw(): void {
  render(root, state, ui, movesForSelection(), {
    onSelectHand(index) {
      if (state.turn !== 'blue' || state.result) return;
      ui.selectedHandIndex = ui.selectedHandIndex === index ? null : index;
      ui.pendingPush = null;
      ui.aiCell = null;
      ui.message = ui.selectedHandIndex === null ? null : 'Tap a highlighted square';
      draw();
    },
    onCellTap(row, col) {
      const options = movesForSelection().filter((m) => m.row === row && m.col === col);
      if (options.length === 0) return;
      if (options[0].type === 'place') {
        playMove(options[0]);
        return;
      }
      // Pushes always preview: show direction picker + chain markers.
      const directions = options
        .filter((m): m is Extract<Move, { type: 'push' }> => m.type === 'push')
        .map((m) => m.direction);
      // A single direction is pre-armed: one tap previews and confirms.
      const armed = directions.length === 1 ? directions[0] : null;
      ui.pendingPush = { row, col, directions, armed };
      ui.message = armed ? 'Tap the arrow to push' : 'Tap an arrow to preview';
      draw();
    },
    onCancelPush() {
      ui.pendingPush = null;
      ui.message = 'Tap a highlighted square';
      draw();
    },
    onPickDirection(direction: Direction) {
      const pending = ui.pendingPush;
      if (!pending) return;
      if (pending.armed !== direction) {
        pending.armed = direction;
        ui.message = 'Tap again to confirm';
        draw();
        return;
      }
      const move = movesForSelection().find(
        (m) => m.type === 'push' && m.row === pending.row && m.col === pending.col && m.direction === direction,
      );
      if (move) playMove(move);
    },
    onNewGame: showPackSelect,
    onChoosePack: start,
    onToggleRules(show) {
      ui.showRules = show;
      draw();
    },
  });
}

function playMove(move: Move): void {
  const prev = captureRects();
  state = applyMove(state, move);
  state.result = checkEnd(state);
  ui.selectedHandIndex = null;
  ui.pendingPush = null;
  ui.message = null;
  ui.aiCell = null;
  draw();
  animateFrom(prev);
  maybeAiTurn();
}

function maybeAiTurn(): void {
  if (state.result || state.turn !== 'red' || ui.packSelect) return;
  ui.message = null;
  setTimeout(() => {
    if (state.result || state.turn !== 'red' || ui.packSelect) return;
    const move = chooseMove(state);
    const prev = captureRects();
    state = applyMove(state, move);
    state.result = checkEnd(state);
    ui.aiCell = { row: move.row, col: move.col };
    draw();
    animateFrom(prev);
    maybeAiTurn();
  }, 1100);
}

/** FLIP animation: capture card positions, re-render, slide from old spots. */
function captureRects(): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-cid]')) {
    rects.set(el.dataset.cid!, el.getBoundingClientRect());
  }
  return rects;
}

function animateFrom(prev: Map<string, DOMRect>): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-cid]')) {
    const old = prev.get(el.dataset.cid!);
    if (!old) {
      el.classList.add('pop-in');
      continue;
    }
    const now = el.getBoundingClientRect();
    const dx = old.x - now.x;
    const dy = old.y - now.y;
    if (!dx && !dy) continue;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.zIndex = '20';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.25s ease-out';
        el.style.transform = '';
        el.addEventListener(
          'transitionend',
          () => {
            el.style.transition = '';
            el.style.zIndex = '';
          },
          { once: true },
        );
      });
    });
  }
}

showPackSelect();
