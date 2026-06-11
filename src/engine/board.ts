import type { Board, Cell, GameState } from './types';
import { BOARD_SIZE } from './types';
import { buildDeck, type Pack } from './cards';

const HAND_SIZE = 3;

/** Semi-random gem layouts: L-shapes and lines, like the game's boards. */
const GEM_LAYOUTS: [number, number][][] = [
  [[0, 0], [0, 1], [1, 0]],
  [[0, 1], [0, 2], [1, 2]],
  [[1, 0], [2, 0], [2, 1]],
  [[1, 2], [2, 1], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
  [[1, 0], [1, 1], [1, 2]],
  [[0, 1], [1, 1], [2, 1]],
];

export function newGame(random: () => number = Math.random, pack: Pack = 'advanced'): GameState {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): Cell => ({ gem: false, placed: null })),
  );
  const layout = GEM_LAYOUTS[Math.floor(random() * GEM_LAYOUTS.length)];
  for (const [r, c] of layout) board[r][c].gem = true;

  const blueDeck = buildDeck('blue', random, pack);
  const redDeck = buildDeck('red', random, pack);

  return {
    board,
    hands: {
      blue: blueDeck.splice(0, HAND_SIZE),
      red: redDeck.splice(0, HAND_SIZE),
    },
    decks: { blue: blueDeck, red: redDeck },
    turn: random() < 0.5 ? 'blue' : 'red',
    result: null,
  };
}
