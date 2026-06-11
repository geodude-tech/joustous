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
  it('basic decks contain only 1-arrow cards', () => {
    const deck = buildDeck('blue', rng(5), 'basic');
    expect(deck).toHaveLength(DECK_SIZE);
    for (const c of deck) expect(c.arrows).toHaveLength(1);
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
      expect(c.arrows).toHaveLength(1);
    }
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
