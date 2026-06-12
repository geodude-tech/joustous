import type { GameState, Move, Player } from './types';
import { BOARD_SIZE, DELTAS, otherPlayer } from './types';
import { legalMoves, applyMove, openPushDirections, pushChain } from './rules';
import { checkEnd, countGems } from './game';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Search depth in plies: easy is pure greed, hard sees its own follow-up. */
const SEARCH_DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
/** Easy skips quiescence so it stays greedy enough to grab poisoned gems. */
const QUIESCE: Record<Difficulty, boolean> = { easy: false, medium: true, hard: true };
/** Gem wars settle within a few flips; cap the quiescence playout regardless. */
const QUIESCE_DEPTH = 4;

const GEM = 100;
// A claimed gem the non-owner can immediately push off again. Full credit for
// flips the opponent reverses next turn is what fueled endless tug-of-war over
// one tile; discounting them makes blockers and well-timed grabs win out.
const GEM_CONTESTED = 50;
// Opponent gems count slightly less than own: play for tempo, racing for open
// gems instead of turtling over the opponent's.
const OPP_GEM = 0.8;
const MATERIAL = 5;
const ADJACENCY = 3;
const WIN = 10_000;
// Tiny root bonus for the position right after the AI's move: when two lines
// back up the same score, it claims now instead of two plies later.
const TEMPO = 0.01;
// Pushing an opponent card without changing any gem's owner is bullying: it
// reads as harassment and wastes tempo. Outweighs the material + adjacency
// gain of shoving a card off the board, but not a real gem defense, which
// search values at ~GEM.
const HARASS = 15;
// Instantly re-flipping the very gem the opponent just took is the tug-of-war
// pattern players read as obsessive. Deferring a turn costs little when the
// retake stays available, so this tips near-equal lines toward developing —
// while clearly winning retakes (a lock, material, the game) still go through.
const RETALIATE = 25;
// Lines scoring within this of the best are interchangeable; picking randomly
// among them keeps play varied. Below MATERIAL and the ~GEM*TEMPO edge of
// claiming now over later, so no real value is traded for variety.
const TIE_EPS = 0.5;

function material(state: GameState, me: Player): number {
  let m = 0;
  for (const row of state.board) {
    for (const cell of row) {
      if (cell.placed) m += cell.placed.owner === me ? 1 : -1;
    }
  }
  return m;
}

/** Own cards orthogonally adjacent to unclaimed gems. Only own cards count:
 *  rewarding denial of the opponent's adjacency made shoving their cards
 *  around score higher than developing. Real threats are caught by search. */
function gemAdjacency(state: GameState, me: Player): number {
  let a = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      if (!cell.gem || cell.placed) continue;
      for (const [dr, dc] of Object.values(DELTAS)) {
        const n = state.board[r + dr]?.[c + dc];
        if (n?.placed?.owner === me) a++;
      }
    }
  }
  return a;
}

/** Claimed gems weighted by stability: full GEM when the non-owner has no
 *  card in hand that can legally push the holder off, GEM_CONTESTED otherwise.
 *  Pushing the gem cell directly dominates upstream pushes (an upstream chain
 *  is blocked whenever the direct one is), so its own chains suffice. */
function gemScore(state: GameState, me: Player): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = state.board[r][c];
      if (!cell.gem || !cell.placed) continue;
      const owner = cell.placed.owner;
      const oppHand = state.hands[otherPlayer(owner)];
      const contested = openPushDirections(state.board, r, c).some((d) =>
        oppHand.some((card) => card.arrows.includes(d)),
      );
      const w = contested ? GEM_CONTESTED : GEM;
      score += owner === me ? w : -OPP_GEM * w;
    }
  }
  return score;
}

function evaluate(state: GameState, me: Player): number {
  return (
    gemScore(state, me) + MATERIAL * material(state, me) + ADJACENCY * gemAdjacency(state, me)
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

/** True if the push slides the occupant of an already-claimed gem: the moves
 *  that fuel tug-of-war. Fresh claims of empty gems stay outside quiescence;
 *  the contested-gem discount already prices those. */
function touchesClaimedGem(state: GameState, move: Move): boolean {
  if (move.type !== 'push') return false;
  const chain = pushChain(state.board, move.row, move.col, move.direction);
  return chain.some(([r, c]) => state.board[r][c].gem);
}

/** Quiescence: at the horizon, play out re-flips of claimed gems (with the
 *  real hands and draws) until the gem war settles. Without this, odd-depth
 *  search scores a flip the opponent reverses next turn as a kept gem — the
 *  horizon effect behind endless tug-of-war over one tile. Either side may
 *  stand pat, so the option value of an unspent threat card is preserved. */
function qsearch(
  state: GameState,
  me: Player,
  qdepth: number,
  alpha: number,
  beta: number,
): number {
  const result = checkEnd(state);
  if (result) {
    if (result.winner === me) return WIN;
    if (result.winner === null) return 0;
    return -WIN;
  }
  const maximizing = state.turn === me;
  let best = evaluate(state, me);
  if (qdepth === 0) return best;
  if (maximizing) alpha = Math.max(alpha, best);
  else beta = Math.min(beta, best);
  if (beta <= alpha) return best;
  // No claimed gem means nothing to war over; skip the move scan entirely.
  if (!state.board.some((row) => row.some((c) => c.gem && c.placed))) return best;

  const before = countGems(state);
  for (const move of dedupe(state, legalMoves(state))) {
    if (!touchesClaimedGem(state, move)) continue;
    const next = applyMove(state, move);
    const after = countGems(next);
    if (after.blue === before.blue && after.red === before.red) continue;
    const v = qsearch(next, me, qdepth - 1, alpha, beta);
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

/** Alpha-beta minimax from `me`'s perspective. */
function search(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  me: Player,
  quiesce: boolean,
): number {
  const result = checkEnd(state);
  if (result) {
    // Prefer sooner wins and later losses.
    if (result.winner === me) return WIN + depth;
    if (result.winner === null) return 0;
    return -(WIN + depth);
  }
  if (depth === 0) {
    return quiesce ? qsearch(state, me, QUIESCE_DEPTH, alpha, beta) : evaluate(state, me);
  }

  const maximizing = state.turn === me;
  // Order children by static eval to sharpen alpha-beta cutoffs.
  const children = dedupe(state, legalMoves(state))
    .map((m) => applyMove(state, m))
    .map((s) => ({ s, e: evaluate(s, me) }))
    .sort((a, b) => (maximizing ? b.e - a.e : a.e - b.e));

  let best = maximizing ? -Infinity : Infinity;
  for (const { s } of children) {
    const v = search(s, depth - 1, alpha, beta, me, quiesce);
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
  const gemsBefore = countGems(state);
  const scored: { move: Move; score: number }[] = [];
  for (const move of moves) {
    const next = applyMove(state, move);
    let score =
      search(next, depth - 1, -Infinity, Infinity, me, QUIESCE[difficulty]) +
      TEMPO * evaluate(next, me);
    if (move.type === 'push' && state.board[move.row][move.col].placed?.owner !== me) {
      const gemsAfter = countGems(next);
      if (gemsAfter.blue === gemsBefore.blue && gemsAfter.red === gemsBefore.red) score -= HARASS;
    }
    if (move.type === 'push') {
      const retaliates = (state.justFlipped ?? []).some(
        ([r, c]) => next.board[r][c].placed?.owner !== state.board[r][c].placed?.owner,
      );
      if (retaliates) score -= RETALIATE;
    }
    scored.push({ move, score });
  }
  const top = Math.max(...scored.map((s) => s.score));
  const best = scored.filter((s) => s.score >= top - TIE_EPS);
  return best[Math.floor(random() * best.length)].move;
}
