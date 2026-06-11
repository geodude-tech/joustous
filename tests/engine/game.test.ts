import { describe, it, expect } from 'vitest';
import { emptyBoard, makeState, card } from './helpers';
import { checkEnd, countGems } from '../../src/engine/game';
import { applyMove, legalMoves } from '../../src/engine/rules';

function fillBoardNoMoves() {
  // Full board where every card resists every push (all 4 arrows... but
  // cards max 3 arrows; use opposing singles so all pushes are blocked).
  const board = emptyBoard();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      board[r][c].placed = {
        card: card(`f${r}${c}`, ['N', 'E', 'S', 'W'] as never),
        owner: (r + c) % 2 === 0 ? 'blue' : 'red',
      };
    }
  }
  return board;
}

describe('gem counting', () => {
  it('counts gems held by each player', () => {
    const board = emptyBoard();
    board[0][0].gem = true;
    board[0][0].placed = { card: card('a', []), owner: 'blue' };
    board[2][2].gem = true;
    board[2][2].placed = { card: card('b', []), owner: 'red' };
    board[1][1].gem = true; // unclaimed
    const state = makeState({ board });
    expect(countGems(state)).toEqual({ blue: 1, red: 1 });
  });
});

describe('end conditions', () => {
  it('no result while moves remain', () => {
    const state = makeState({ hand: [card('a', ['N'])] });
    expect(checkEnd(state)).toBeNull();
  });

  it('ends with gem winner when current player has no legal move', () => {
    const board = fillBoardNoMoves();
    board[0][0].gem = true; // owned by blue per fill pattern
    const state = makeState({ board, redHand: [card('a', ['N'])], turn: 'red' });
    const result = checkEnd(state);
    expect(result?.reason).toBe('gems');
    expect(result?.winner).toBe('blue');
  });

  it('draw when gems are equal at end', () => {
    const board = fillBoardNoMoves();
    board[0][0].gem = true; // blue
    board[0][1].gem = true; // red
    const state = makeState({ board, hand: [card('a', ['N'])] });
    const result = checkEnd(state);
    expect(result?.winner).toBeNull();
  });

  it('player with empty hand and deck loses (deck-out)', () => {
    const state = makeState({ hand: [], deck: [], turn: 'blue' });
    const result = checkEnd(state);
    expect(result?.reason).toBe('deck-out');
    expect(result?.winner).toBe('red');
  });

  it('a full game via applyMove reaches an end state', () => {
    // Tiny decks: each player plays cards until someone decks out or board locks.
    let state = makeState({
      hand: [card('b1', ['E']), card('b2', ['N'])],
      deck: [card('b3', ['S'])],
      redHand: [card('r1', ['W']), card('r2', ['S'])],
      redDeck: [card('r3', ['N'])],
    });
    let guard = 0;
    while (!checkEnd(state) && guard++ < 50) {
      const moves = legalMoves(state);
      state = applyMove(state, moves[0]);
    }
    expect(checkEnd(state)).not.toBeNull();
  });
});
