import type { GameState, Move, Player } from './types';
import { BOARD_SIZE, DELTAS, otherPlayer } from './types';
import { legalMoves, applyMove } from './rules';
import { checkEnd, countGems } from './game';

const GEM = 100;
const THREAT = 30; // opponent's counter-gems are discounted: play for tempo, not turtling
const MATERIAL = 5;
const ADJACENCY = 3;
const WIN = 10_000;

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

/** Best immediate gem swing available to the player to move in `state`. */
function bestGemSwing(state: GameState): number {
  const mover = state.turn;
  const opp = otherPlayer(mover);
  const before = countGems(state);
  let best = 0;
  for (const move of legalMoves(state)) {
    const after = countGems(applyMove(state, move));
    const swing = after[mover] - before[mover] - (after[opp] - before[opp]);
    if (swing > best) best = swing;
  }
  return best;
}

/**
 * Scores each legal move by: immediate gem swing, board material (rewards
 * knocking opponent cards off the board, penalizes losing own), development
 * next to open gems, minus the opponent's best counter-gem-swing. Pushes get
 * no inherent bonus, so the AI only pushes when it accomplishes something.
 * Ties broken randomly.
 */
export function chooseMove(state: GameState, random: () => number = Math.random): Move {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('no legal moves');

  const me = state.turn;
  const opp = otherPlayer(me);
  const before = countGems(state);

  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = applyMove(state, move);
    const gems = countGems(next);
    const gemSwing = gems[me] - before[me] - (gems[opp] - before[opp]);
    let score = GEM * gemSwing + MATERIAL * material(next, me) + ADJACENCY * gemAdjacency(next, me);
    const result = checkEnd(next);
    if (result) {
      score += result.winner === me ? WIN : result.winner === opp ? -WIN : 0;
    } else {
      score -= THREAT * bestGemSwing(next);
    }
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[Math.floor(random() * best.length)];
}
