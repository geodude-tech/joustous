import { describe, it, expect } from 'vitest';
import { emptyBoard, makeState, card } from './helpers';
import { newGame } from '../../src/engine/board';
import { chooseMove, type Difficulty } from '../../src/engine/ai';
import { legalMoves, applyMove } from '../../src/engine/rules';
import { checkEnd } from '../../src/engine/game';

function rng(seed: number): () => number {
  let s = seed;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  next();
  next();
  next();
  return next;
}

/** Gem at (1,1); blue can push its own card onto it, but red's E-arrow card
 *  can immediately steal it back. A quiet placement is available instead. */
function poisonedGemState() {
  const board = emptyBoard();
  board[1][1].gem = true;
  board[1][0].placed = { card: card('x', []), owner: 'blue' };
  return makeState({
    board,
    hand: [card('a', ['E'])],
    deck: [card('bd1', []), card('bd2', [])],
    redHand: [card('r', ['E'])],
    redDeck: [card('rd1', []), card('rd2', [])],
    turn: 'blue',
  });
}

const POISONED_PUSH = { type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' };

describe('difficulty levels', () => {
  it('easy grabs the gem even though it can be stolen right back', () => {
    const move = chooseMove(poisonedGemState(), rng(1), 'easy');
    expect(move).toEqual(POISONED_PUSH);
  });

  it.each<Difficulty>(['medium', 'hard'])('%s avoids the poisoned gem', (difficulty) => {
    for (let i = 1; i <= 5; i++) {
      const move = chooseMove(poisonedGemState(), rng(i), difficulty);
      expect(move).not.toEqual(POISONED_PUSH);
    }
  });

  it.each<Difficulty>(['easy', 'medium', 'hard'])(
    '%s always returns a legal move across random games',
    (difficulty) => {
      for (let seed = 1; seed <= 5; seed++) {
        const random = rng(seed * 11);
        let state = newGame(random);
        let guard = 0;
        while (!checkEnd(state) && guard++ < 200) {
          const move = chooseMove(state, random, difficulty);
          expect(legalMoves(state)).toContainEqual(move);
          state = applyMove(state, move);
        }
        expect(checkEnd(state)).not.toBeNull();
      }
    },
  );

  it.each<Difficulty>(['easy', 'medium', 'hard'])(
    '%s does not bully a harmless opponent card',
    (difficulty) => {
      // Blue's corner card threatens nothing (no arrows anywhere in blue's
      // hand); red could shove it off the board but should develop instead.
      const board = emptyBoard();
      board[2][0].gem = true;
      board[0][2].placed = { card: card('x', []), owner: 'blue' };
      const state = makeState({
        board,
        hand: [card('b1', []), card('b2', [])],
        deck: [card('bd1', []), card('bd2', [])],
        redHand: [card('r', ['E'])],
        redDeck: [card('rd1', []), card('rd2', [])],
        turn: 'red',
      });
      for (let i = 1; i <= 5; i++) {
        expect(chooseMove(state, rng(i), difficulty).type).toBe('place');
      }
    },
  );

  it('hard (blue) beats easy (red) over a series of games', () => {
    const wins = { blue: 0, red: 0, draw: 0 };
    for (let seed = 1; seed <= 8; seed++) {
      const random = rng(seed * 13);
      let state = newGame(random);
      let guard = 0;
      while (!checkEnd(state) && guard++ < 200) {
        const difficulty: Difficulty = state.turn === 'blue' ? 'hard' : 'easy';
        state = applyMove(state, chooseMove(state, random, difficulty));
      }
      const result = checkEnd(state)!;
      wins[result.winner ?? 'draw']++;
    }
    expect(wins.blue).toBeGreaterThan(wins.red);
  });
});
