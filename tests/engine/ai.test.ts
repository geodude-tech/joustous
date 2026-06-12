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

describe('gem stability', () => {
  it.each<Difficulty>(['easy', 'medium', 'hard'])(
    '%s locks its own contested gem instead of developing elsewhere',
    (difficulty) => {
      // Red holds the gem at (1,1); blue's E card can push red off it. Red's
      // W card blocks that lane (placed at (1,2), or stacked onto the gem).
      const board = emptyBoard();
      board[1][1].gem = true;
      board[1][1].placed = { card: card('R0', []), owner: 'red' };
      const state = makeState({
        board,
        hand: [card('be1', ['E']), card('be2', ['E'])],
        deck: [card('bd1', []), card('bd2', []), card('bd3', [])],
        redHand: [card('rw', ['W']), card('rz', [])],
        redDeck: [card('rd1', []), card('rd2', []), card('rd3', [])],
        turn: 'red',
      });
      for (let i = 1; i <= 5; i++) {
        const next = applyMove(state, chooseMove(state, rng(i), difficulty));
        expect(next.board[1][1].placed?.owner).toBe('red');
        // Whatever red played, blue must have no reply that retakes the gem.
        for (const reply of legalMoves(next)) {
          expect(applyMove(next, reply).board[1][1].placed?.owner).toBe('red');
        }
      }
    },
  );

  it.each<Difficulty>(['medium', 'hard'])(
    '%s develops instead of a gem flip the opponent immediately reverses',
    (difficulty) => {
      // Blue holds the gem; red's E card can flip it, but blue's E card flips
      // it right back. Burning the threat card on a futile flip is worse than
      // developing while keeping the gem contested.
      const board = emptyBoard();
      board[1][1].gem = true;
      board[1][1].placed = { card: card('x', []), owner: 'blue' };
      const state = makeState({
        board,
        hand: [card('be', ['E']), card('bz', [])],
        deck: [card('bd1', []), card('bd2', []), card('bd3', []), card('bd4', [])],
        redHand: [card('re', ['E']), card('rz', [])],
        redDeck: [card('rd1', []), card('rd2', []), card('rd3', []), card('rd4', [])],
        turn: 'red',
      });
      for (let i = 1; i <= 5; i++) {
        expect(chooseMove(state, rng(i), difficulty).type).toBe('place');
      }
    },
  );

  it.each<Difficulty>(['easy', 'medium', 'hard'])(
    '%s claims a gem with the card that locks it, not the one that loses it back',
    (difficulty) => {
      // Both red cards can claim the gem at (1,0). The W card faces blue's
      // only attack lane (E) and locks the claim; the E card gets re-flipped.
      const board = emptyBoard();
      board[1][0].gem = true;
      board[1][0].placed = { card: card('p', []), owner: 'blue' };
      const state = makeState({
        board,
        hand: [card('be', ['E']), card('bz', [])],
        deck: [card('bd1', []), card('bd2', []), card('bd3', [])],
        redHand: [card('rw', ['W']), card('re', ['E'])],
        redDeck: [card('rd1', []), card('rd2', []), card('rd3', [])],
        turn: 'red',
      });
      for (let i = 1; i <= 5; i++) {
        expect(chooseMove(state, rng(i), difficulty)).toEqual({
          type: 'push',
          handIndex: 0,
          row: 1,
          col: 0,
          direction: 'W',
        });
      }
    },
  );

  it('does not immediately re-flip the gem the opponent just took', () => {
    // Blue just claimed the gem (justFlipped marks it). Red can win the gem
    // war outright (two E answers to blue's one), so without the retaliation
    // penalty retaking now and retaking later score the same and the tempo
    // bonus picks "now". Natural play lets go for a turn and develops.
    const board = emptyBoard();
    board[1][1].gem = true;
    board[1][1].placed = { card: card('B1', ['E']), owner: 'blue' };
    const make = (justFlipped?: [number, number][]) =>
      makeState({
        board: board.map((row) => row.map((cell) => ({ ...cell }))),
        hand: [card('be2', ['E']), card('bz', [])],
        deck: [card('bd1', []), card('bd2', []), card('bd3', []), card('bd4', [])],
        redHand: [card('re1', ['E']), card('re2', ['E']), card('rz', [])],
        redDeck: [card('rd1', []), card('rd2', []), card('rd3', []), card('rd4', [])],
        turn: 'red',
        justFlipped,
      });
    for (let i = 1; i <= 5; i++) {
      expect(chooseMove(make([[1, 1]]), rng(i), 'hard').type).toBe('place');
    }
    // Sanity: without the marker the same retake is taken — the penalty,
    // not some other preference, is what defers it.
    expect(chooseMove(make(), rng(1), 'hard')).toMatchObject({ type: 'push', row: 1, col: 1 });
  });

  it('varies its move across seeds when several lines are near-equal', () => {
    const board = emptyBoard();
    board[1][1].gem = true;
    const state = makeState({
      board,
      hand: [card('bz1', []), card('bz2', [])],
      deck: [card('bd1', []), card('bd2', [])],
      redHand: [card('rn', ['N']), card('re', ['E']), card('rs', ['S'])],
      redDeck: [card('rd1', []), card('rd2', []), card('rd3', []), card('rd4', [])],
      turn: 'red',
    });
    const picks = new Set<string>();
    for (let i = 1; i <= 12; i++) {
      picks.add(JSON.stringify(chooseMove(state, rng(i), 'medium')));
    }
    expect(picks.size).toBeGreaterThan(1);
  });
});
