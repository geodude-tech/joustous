import { describe, it, expect } from 'vitest';
import { buildDeck, DECK_SIZE } from '../../src/engine/cards';
import { newGame } from '../../src/engine/board';
import { checkEnd } from '../../src/engine/game';
import { emptyBoard, makeState, card } from './helpers';

function rng(seed: number): () => number {
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  next(); next(); next();
  return next;
}

describe('card packs', () => {
  it('basic decks are a small curated roster of 1-2 arrow cards with a few doubles', () => {
    const deck = buildDeck('blue', rng(5), 'basic');
    expect(deck).toHaveLength(DECK_SIZE);
    for (const c of deck) expect(c.arrows.length).toBeLessThanOrEqual(2);
    // Small distinct roster (8 curated cards), repeated to fill the deck.
    expect(new Set(deck.map((c) => c.name)).size).toBeLessThanOrEqual(8);
    // A few double-arrow cards are present, but singles still dominate.
    const doubles = new Set(deck.filter((c) => c.arrows.length === 2).map((c) => c.name));
    expect(doubles.size).toBeGreaterThanOrEqual(2);
    expect(doubles.size).toBeLessThanOrEqual(3);
  });

  it('intermediate decks contain only 1-2 arrow cards', () => {
    const deck = buildDeck('blue', rng(5), 'intermediate');
    expect(deck).toHaveLength(DECK_SIZE);
    for (const c of deck) expect(c.arrows.length).toBeLessThanOrEqual(2);
  });

  it('advanced decks may contain 3-arrow cards', () => {
    const deck = buildDeck('blue', rng(5), 'advanced');
    expect(deck).toHaveLength(DECK_SIZE);
    expect(deck.some((c) => c.arrows.length === 3)).toBe(true);
  });

  it('deck ids stay unique even when pool repeats', () => {
    const deck = buildDeck('blue', rng(5), 'basic');
    expect(new Set(deck.map((c) => c.id)).size).toBe(DECK_SIZE);
  });

  it('newGame accepts a pack', () => {
    const state = newGame(rng(7), 'basic');
    for (const c of [...state.hands.blue, ...state.decks.blue]) {
      expect(c.arrows.length).toBeLessThanOrEqual(2);
    }
  });

  it('basic mode is a 2x2 play area wrapped in a walled out-of-bounds ring with one gem', () => {
    const state = newGame(rng(7), 'basic');
    expect(state.walls).toBe(true);
    const cells = state.board.flat();
    expect(cells).toHaveLength(16); // 4x4: 2x2 play area + one-cell ring
    expect(cells.filter((c) => !c.oob)).toHaveLength(4); // play area
    expect(cells.filter((c) => c.oob)).toHaveLength(12); // ring
    expect(cells.filter((c) => c.gem)).toHaveLength(1);
    // Gems only sit on play cells, never the ring.
    expect(cells.every((c) => !(c.gem && c.oob))).toBe(true);
  });
});

describe('board-full end rule', () => {
  it('game ends by gems when every square is occupied, even if pushes remain', () => {
    const board = emptyBoard();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        // arrowless cards: pushable, so pushes would still be legal
        board[r][c].placed = { card: card(`f${r}${c}`, []), owner: 'blue' };
      }
    }
    board[0][0].gem = true;
    const state = makeState({ board, hand: [card('a', ['N'])], redHand: [card('b', ['S'])] });
    const result = checkEnd(state);
    expect(result?.reason).toBe('gems');
    expect(result?.winner).toBe('blue');
  });

  it('game continues while any square is empty and moves exist', () => {
    const board = emptyBoard();
    board[0][0].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['N'])] });
    expect(checkEnd(state)).toBeNull();
  });
});
