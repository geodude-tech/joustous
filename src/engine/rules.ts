import type { Board, Direction, GameState, Move, Player, PushMove } from './types';
import { BOARD_SIZE, DELTAS, OPPOSITE, otherPlayer } from './types';

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const hand = state.hands[state.turn];
  for (let handIndex = 0; handIndex < hand.length; handIndex++) {
    const handCard = hand[handIndex];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = state.board[row][col];
        if (!cell.placed) {
          if (!cell.gem) moves.push({ type: 'place', handIndex, row, col });
          continue;
        }
        for (const direction of handCard.arrows) {
          if (chainBlocked(state.board, row, col, direction)) continue;
          moves.push({ type: 'push', handIndex, row, col, direction });
        }
      }
    }
  }
  return moves;
}

/** A push is blocked if any card in the contiguous chain has an opposing arrow. */
function chainBlocked(board: Board, row: number, col: number, direction: Direction): boolean {
  const [dr, dc] = DELTAS[direction];
  let r = row;
  let c = col;
  let placed = inBounds(r, c) ? board[r][c].placed : null;
  while (placed) {
    if (placed.card.arrows.includes(OPPOSITE[direction])) return true;
    r += dr;
    c += dc;
    placed = inBounds(r, c) ? board[r][c].placed : null;
  }
  return false;
}

/** Cells (in chain order) that would slide if a push at (row, col) goes through. */
export function pushChain(
  board: Board,
  row: number,
  col: number,
  direction: Direction,
): [number, number][] {
  const [dr, dc] = DELTAS[direction];
  const chain: [number, number][] = [];
  let r = row;
  let c = col;
  while (inBounds(r, c) && board[r][c].placed) {
    chain.push([r, c]);
    r += dr;
    c += dc;
  }
  return chain;
}

export interface PushPreview {
  /** Cells (in chain order) whose cards slide. */
  chain: [number, number][];
  /** Gem cells whose holder changes, with the new owner. */
  claims: { row: number; col: number; owner: Player }[];
  /** Current cells of cards that would slide off the board. */
  falls: [number, number][];
}

/** What a push would do, for UI previews. Assumes the move is legal. */
export function previewPush(state: GameState, move: PushMove): PushPreview {
  const chain = pushChain(state.board, move.row, move.col, move.direction);
  const next = applyMove(state, move);

  const claims: PushPreview['claims'] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const before = state.board[r][c];
      const after = next.board[r][c];
      if (before.gem && after.placed && after.placed.owner !== before.placed?.owner) {
        claims.push({ row: r, col: c, owner: after.placed.owner });
      }
    }
  }

  const falls: PushPreview['falls'] = [];
  const last = chain[chain.length - 1];
  if (last) {
    const [dr, dc] = DELTAS[move.direction];
    if (!inBounds(last[0] + dr, last[1] + dc)) falls.push(last);
  }

  return { chain, claims, falls };
}

function resolvePush(board: Board, move: PushMove): void {
  const [dr, dc] = DELTAS[move.direction];
  const chain = pushChain(board, move.row, move.col, move.direction);
  // Shift from the far end backward; a card shifted out of bounds is removed.
  for (let i = chain.length - 1; i >= 0; i--) {
    const [cr, cc] = chain[i];
    const nr = cr + dr;
    const nc = cc + dc;
    if (inBounds(nr, nc)) board[nr][nc].placed = board[cr][cc].placed;
    board[cr][cc].placed = null;
  }
}

export function applyMove(state: GameState, move: Move): GameState {
  const board = cloneBoard(state.board);
  const mover = state.turn;
  const hand = [...state.hands[mover]];
  const deck = [...state.decks[mover]];
  const played = hand.splice(move.handIndex, 1)[0];

  if (move.type === 'push') resolvePush(board, move);
  board[move.row][move.col].placed = { card: played, owner: mover };

  const drawn = deck.shift();
  if (drawn) hand.push(drawn);

  return {
    ...state,
    board,
    hands: { ...state.hands, [mover]: hand },
    decks: { ...state.decks, [mover]: deck },
    turn: otherPlayer(mover),
  };
}

export function arrowBlocked(targetArrows: Direction[], direction: Direction): boolean {
  return targetArrows.includes(OPPOSITE[direction]);
}
