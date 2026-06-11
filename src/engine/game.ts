import type { GameResult, GameState, Player } from './types';
import { otherPlayer } from './types';
import { legalMoves } from './rules';

export function countGems(state: GameState): Record<Player, number> {
  const gems: Record<Player, number> = { blue: 0, red: 0 };
  for (const row of state.board) {
    for (const cell of row) {
      if (cell.gem && cell.placed) gems[cell.placed.owner]++;
    }
  }
  return gems;
}

/** Returns the game result if the game has ended for the player to move, else null. */
export function checkEnd(state: GameState): GameResult | null {
  const mover = state.turn;
  const gems = countGems(state);

  if (state.hands[mover].length === 0 && state.decks[mover].length === 0) {
    return { winner: otherPlayer(mover), reason: 'deck-out', gems };
  }

  // Per the manual, the match ends when the open squares are full.
  const boardFull = state.board.every((row) => row.every((cell) => cell.placed));

  if (boardFull || legalMoves(state).length === 0) {
    const winner = gems.blue > gems.red ? 'blue' : gems.red > gems.blue ? 'red' : null;
    return { winner, reason: 'gems', gems };
  }

  return null;
}
