import type { Board, Direction, GameState, Move, Player, PushMove } from './types';
import { DELTAS, OPPOSITE, otherPlayer } from './types';

function inBounds(board: Board, row: number, col: number): boolean {
  return row >= 0 && row < board.length && col >= 0 && col < board.length;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const hand = state.hands[state.turn];
  const size = state.board.length;
  const walls = state.walls ?? false;
  for (let handIndex = 0; handIndex < hand.length; handIndex++) {
    const handCard = hand[handIndex];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cell = state.board[row][col];
        // OOB ring cells can't be placed on or pushed from; they only ever
        // receive a card pushed in from the play area.
        if (cell.oob) continue;
        if (!cell.placed) {
          if (!cell.gem) moves.push({ type: 'place', handIndex, row, col });
          continue;
        }
        for (const direction of handCard.arrows) {
          if (chainBlocked(state.board, row, col, direction, walls)) continue;
          moves.push({ type: 'push', handIndex, row, col, direction });
        }
      }
    }
  }
  return moves;
}

/** Directions in which the chain starting at (row,col) can legally be pushed. */
export function openPushDirections(
  board: Board,
  row: number,
  col: number,
  walls = false,
): Direction[] {
  return (Object.keys(DELTAS) as Direction[]).filter(
    (d) => !chainBlocked(board, row, col, d, walls),
  );
}

/**
 * A push is blocked if any card in the contiguous chain has an opposing arrow.
 * On a walled board it is also blocked if the chain runs to the edge, since the
 * trailing card would have nowhere on the board to land.
 */
function chainBlocked(
  board: Board,
  row: number,
  col: number,
  direction: Direction,
  walls = false,
): boolean {
  const [dr, dc] = DELTAS[direction];
  let r = row;
  let c = col;
  let placed = inBounds(board, r, c) ? board[r][c].placed : null;
  while (placed) {
    if (placed.card.arrows.includes(OPPOSITE[direction])) return true;
    r += dr;
    c += dc;
    placed = inBounds(board, r, c) ? board[r][c].placed : null;
  }
  // (r,c) is the landing cell for the trailing card; off-board means the wall blocks it.
  if (walls && !inBounds(board, r, c)) return true;
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
  while (inBounds(board, r, c) && board[r][c].placed) {
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
  const size = state.board.length;

  const claims: PushPreview['claims'] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const before = state.board[r][c];
      const after = next.board[r][c];
      if (before.gem && after.placed && after.placed.owner !== before.placed?.owner) {
        claims.push({ row: r, col: c, owner: after.placed.owner });
      }
    }
  }

  // Walled boards never drop a card off the edge.
  const falls: PushPreview['falls'] = [];
  const last = chain[chain.length - 1];
  if (last && !state.walls) {
    const [dr, dc] = DELTAS[move.direction];
    if (!inBounds(state.board, last[0] + dr, last[1] + dc)) falls.push(last);
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
    if (inBounds(board, nr, nc)) board[nr][nc].placed = board[cr][cc].placed;
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

  const justFlipped: [number, number][] = [];
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = board[r][c];
      if (cell.gem && cell.placed && cell.placed.owner !== state.board[r][c].placed?.owner) {
        justFlipped.push([r, c]);
      }
    }
  }

  return {
    ...state,
    board,
    hands: { ...state.hands, [mover]: hand },
    decks: { ...state.decks, [mover]: deck },
    turn: otherPlayer(mover),
    justFlipped,
  };
}

export function arrowBlocked(targetArrows: Direction[], direction: Direction): boolean {
  return targetArrows.includes(OPPOSITE[direction]);
}
