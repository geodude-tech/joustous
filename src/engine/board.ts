import type { Board, Cell, GameState } from './types';
import { buildDeck, type Pack } from './cards';

const HAND_SIZE = 3;

/** Play-area edge length per pack. Basic is a compact 2x2 (see the game's
 *  tutorial boards) wrapped in an out-of-bounds ring; the others use 3x3. */
export const BOARD_SIZES: Record<Pack, number> = { basic: 2, intermediate: 3, advanced: 3 };

/** Packs whose play area is wrapped in a one-cell out-of-bounds ring: a card
 *  can be pushed into the ring once, then the outer edge wall stops it. */
const RINGED: Record<Pack, boolean> = { basic: true, intermediate: false, advanced: false };

/** Gem layouts in full-board coordinates, keyed by the full board size. The
 *  basic 4-grid (2x2 play area + ring) puts a single gem on an inner cell;
 *  the 3x3 boards use L-shapes and lines. */
const GEM_LAYOUTS: Record<number, [number, number][][]> = {
  4: [
    [[1, 1]],
    [[1, 2]],
    [[2, 1]],
    [[2, 2]],
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
  const ring = RINGED[pack];
  const size = BOARD_SIZES[pack] + (ring ? 2 : 0);
  const board: Board = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c): Cell => {
      const cell: Cell = { gem: false, placed: null };
      if (ring && (r === 0 || r === size - 1 || c === 0 || c === size - 1)) cell.oob = true;
      return cell;
    }),
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
