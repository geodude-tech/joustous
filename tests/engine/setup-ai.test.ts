import { describe, it, expect } from 'vitest';
import { newGame } from '../../src/engine/board';
import { CARD_POOL, buildDeck } from '../../src/engine/cards';
import { chooseMove } from '../../src/engine/ai';
import { legalMoves, applyMove } from '../../src/engine/rules';
import { checkEnd } from '../../src/engine/game';
import type { GameState } from '../../src/engine/types';

function rng(seed: number): () => number {
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  // warm up: low-quality first outputs for adjacent seeds
  next();
  next();
  next();
  return next;
}

describe('card pool', () => {
  it('has at least 32 cards, each with 1-3 arrows and a portrait index', () => {
    expect(CARD_POOL.length).toBeGreaterThanOrEqual(32);
    for (const c of CARD_POOL) {
      expect(c.arrows.length).toBeGreaterThanOrEqual(1);
      expect(c.arrows.length).toBeLessThanOrEqual(3);
      expect(new Set(c.arrows).size).toBe(c.arrows.length);
      expect(c.portraitIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('buildDeck returns 16 cards with unique ids', () => {
    const deck = buildDeck('blue', rng(1));
    expect(deck).toHaveLength(16);
    expect(new Set(deck.map((c) => c.id)).size).toBe(16);
  });
});

describe('newGame', () => {
  it('creates a 3x3 board with exactly 3 gems and no cards', () => {
    const state = newGame(rng(42));
    const cells = state.board.flat();
    expect(cells).toHaveLength(9);
    expect(cells.filter((c) => c.gem)).toHaveLength(3);
    expect(cells.every((c) => c.placed === null)).toBe(true);
  });

  it('deals 3 cards to each hand, 13 remain in each deck', () => {
    const state = newGame(rng(42));
    expect(state.hands.blue).toHaveLength(3);
    expect(state.hands.red).toHaveLength(3);
    expect(state.decks.blue).toHaveLength(13);
    expect(state.decks.red).toHaveLength(13);
  });

  it('gem layouts vary across seeds', () => {
    const layout = (s: GameState) =>
      s.board.flat().map((c) => (c.gem ? '1' : '0')).join('');
    const layouts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((n) => layout(newGame(rng(n)))));
    expect(layouts.size).toBeGreaterThan(1);
  });
});

describe('AI', () => {
  it('always returns a legal move across many random games', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const random = rng(seed * 7);
      let state = newGame(random);
      let guard = 0;
      while (!checkEnd(state) && guard++ < 200) {
        const move = chooseMove(state, random);
        expect(legalMoves(state)).toContainEqual(move);
        state = applyMove(state, move);
      }
      // every game terminates
      expect(checkEnd(state)).not.toBeNull();
    }
  });

  it('claims an available gem when it can', () => {
    // Blue card adjacent to a gem; blue AI should push its own card onto it.
    const state = newGame(rng(3));
    const board = state.board;
    for (const row of board) for (const cell of row) { cell.gem = false; cell.placed = null; }
    board[1][1].gem = true;
    board[1][0].placed = { card: { id: 'x', name: 'x', arrows: [], portraitIndex: 0 }, owner: 'blue' };
    state.hands.blue = [{ id: 'a', name: 'a', arrows: ['E'], portraitIndex: 1 }];
    state.turn = 'blue';
    const move = chooseMove(state, rng(9));
    expect(move).toEqual({ type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' });
  });
});
