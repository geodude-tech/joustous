import type { Board, Cell, GameState } from './types';
import { buildDeck, type Pack } from './cards';

const HAND_SIZE = 3;

/** Board edge length per pack. Basic is a compact, walled 2x2 (see the game's
 *  tutorial boards); the others use the standard 3x3. */
export const BOARD_SIZES: Record<Pack, number> = { basic: 2, intermediate: 3, advanced: 3 };

/** Semi-random gem layouts keyed by board size. 2x2 uses a single gem (the
 *  other three cells stay placeable); 3x3 uses L-shapes and lines. */
const GEM_LAYOUTS: Record<number, [number, number][][]> = {
  2: [
    [[0, 0]],
    [[0, 1]],
    [[1, 0]],
    [[1, 1]],
  ],
  3: [
    [[0, 0], [0, 1], [1, 0]],
    [[0, 1], [0, 2], [1, 2]],
    [[1, 0], [2, 0], [2, 1]],
    [[1, 2], [2, 1], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
    [[1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1]],
  ],
};

export function newGame(random: () => number = Math.random, pack: Pack = 'advanced'): GameState {
  const size = BOARD_SIZES[pack];
  const board: Board = Array.from({ length: size }, () =>
    Array.from({ length: size }, (): Cell => ({ gem: false, placed: null })),
  );
  const layouts = GEM_LAYOUTS[size];
  const layout = layouts[Math.floor(random() * layouts.length)];
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
    walls: pack === 'basic',
    result: null,
  };
}
