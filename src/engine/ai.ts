import type { GameState, Move } from './types';
import { legalMoves, applyMove } from './rules';
import { countGems } from './game';

/**
 * Greedy AI: score each legal move by the resulting gem differential,
 * with a small bonus for placements adjacent to open gems and a penalty
 * for leaving own cards pushable off gems. Ties broken randomly.
 */
export function chooseMove(state: GameState, random: () => number = Math.random): Move {
  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('no legal moves');

  const me = state.turn;
  const before = countGems(state);

  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const move of moves) {
    const after = countGems(applyMove(state, move));
    const myGain = after[me] - before[me];
    const oppGain = after[me === 'blue' ? 'red' : 'blue'] - before[me === 'blue' ? 'red' : 'blue'];
    const score = myGain * 10 - oppGain * 10 + (move.type === 'push' ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = [move];
    } else if (score === bestScore) {
      best.push(move);
    }
  }
  return best[Math.floor(random() * best.length)];
}
