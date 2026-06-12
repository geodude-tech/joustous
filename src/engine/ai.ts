import type { GameState, Move, Player } from './types';
import { BOARD_SIZE, DELTAS, otherPlayer } from './types';
import { legalMoves, applyMove } from './rules';
import { checkEnd, countGems } from './game';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Search depth in plies: easy is pure greed, hard sees its own follow-up. */
const SEARCH_DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

const GEM = 100;
const MATERIAL = 5;
const ADJACENCY = 3;
const WIN = 10_000;
// Tiny root bonus for the position right after the AI's move: when two lines
// back up the same score, it claims now instead of two plies later.
const TEMPO = 0.01;

function material(state: GameState, me: Player): number {
  let m = 0;
  for (const row of state.board) {
    for (const cell of row) {
      if (cell.placed) m += cell.placed.owner === me ? 1 : -1;
    }
  }
  return m;
}

/** Cards orthogonally adjacent to unclaimed gems: mine minus theirs. */
function gemAdjacency(state: GameState, me: Player): number {
  let a = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      if (!cell.gem || cell.placed) continue;
      for (const [dr, dc] of Object.values(DELTAS)) {
        const n = state.board[r + dr]?.[c + dc];
        if (n?.placed) a += n.placed.owner === me ? 1 : -1;
      }
    }
  }
  return a;
}

function evaluate(state: GameState, me: Player): number {
  const gems = countGems(state);
  return (
    GEM * (gems[me] - gems[otherPlayer(me)]) +
    MATERIAL * material(state, me) +
    ADJACENCY * gemAdjacency(state, me)
  );
}

/** Cards with identical arrows are interchangeable: search one of them. */
function dedupe(state: GameState, moves: Move[]): Move[] {
  const hand = state.hands[state.turn];
  const seen = new Set<string>();
  const out: Move[] = [];
  for (const m of moves) {
    const dir = m.type === 'push' ? m.direction : '';
    const key = `${m.type},${m.row},${m.col},${dir},${hand[m.handIndex].arrows.join('')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

/** Alpha-beta minimax from `me`'s perspective. */
function search(state: GameState, depth: number, alpha: number, beta: number, me: Player): number {
  const result = checkEnd(state);
  if (result) {
    // Prefer sooner wins and later losses.
    if (result.winner === me) return WIN + depth;
    if (result.winner === null) return 0;
    return -(WIN + depth);
  }
  if (depth === 0) return evaluate(state, me);

  const maximizing = state.turn === me;
  // Order children by static eval to sharpen alpha-beta cutoffs.
  const children = dedupe(state, legalMoves(state))
    .map((m) => applyMove(state, m))
    .map((s) => ({ s, e: evaluate(s, me) }))
    .sort((a, b) => (maximizing ? b.e - a.e : a.e - b.e));

  let best = maximizing ? -Infinity : Infinity;
  for (const { s } of children) {
    const v = search(s, depth - 1, alpha, beta, me);
    if (maximizing) {
      if (v > best) best = v;
      if (v > alpha) alpha = v;
    } else {
      if (v < best) best = v;
      if (v < beta) beta = v;
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function chooseMove(
  state: GameState,
  random: () => number = Math.random,
  difficulty: Difficulty = 'hard',
): Move {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('no legal moves');

  const depth = SEARCH_DEPTH[difficulty];
  const me = state.turn;
  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = applyMove(state, move);
    const score = search(next, depth - 1, -Infinity, Infinity, me) + TEMPO * evaluate(next, me);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[Math.floor(random() * best.length)];
}
