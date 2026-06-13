import { describe, it, expect } from 'vitest';
import { emptyBoard, makeState, card } from './helpers';
import { legalMoves, applyMove } from '../../src/engine/rules';
import type { Move } from '../../src/engine/types';

describe('placement', () => {
  it('allows placing on an empty non-gem square', () => {
    const state = makeState({ hand: [card('a', ['N'])] });
    const moves = legalMoves(state);
    expect(moves).toContainEqual<Move>({ type: 'place', handIndex: 0, row: 0, col: 0 });
  });

  it('forbids placing directly on an empty gem square', () => {
    const state = makeState({ hand: [card('a', ['N'])], gems: [[1, 1]] });
    const moves = legalMoves(state);
    expect(moves).not.toContainEqual<Move>({ type: 'place', handIndex: 0, row: 1, col: 1 });
  });

  it('place puts the card on the board owned by mover and draws a replacement', () => {
    const state = makeState({
      hand: [card('a', ['N'])],
      deck: [card('d1', ['S'])],
    });
    const next = applyMove(state, { type: 'place', handIndex: 0, row: 2, col: 2 });
    expect(next.board[2][2].placed?.card.id).toBe('a');
    expect(next.board[2][2].placed?.owner).toBe('blue');
    expect(next.hands.blue.map((c) => c.id)).toEqual(['d1']);
    expect(next.decks.blue).toHaveLength(0);
    expect(next.turn).toBe('red');
  });
});

describe('push mechanics', () => {
  it('allows pushing an occupant in a direction the new card has an arrow for', () => {
    const board = emptyBoard();
    board[1][1].placed = { card: card('x', ['N']), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    expect(legalMoves(state)).toContainEqual<Move>({
      type: 'push', handIndex: 0, row: 1, col: 1, direction: 'E',
    });
  });

  it('rejects push when occupant has the opposing arrow', () => {
    const board = emptyBoard();
    board[1][1].placed = { card: card('x', ['W']), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    expect(legalMoves(state)).not.toContainEqual<Move>({
      type: 'push', handIndex: 0, row: 1, col: 1, direction: 'E',
    });
  });

  it('rejects push in a direction the new card has no arrow for', () => {
    const board = emptyBoard();
    board[1][1].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['N'])] });
    const pushes = legalMoves(state).filter((m) => m.type === 'push' && m.row === 1 && m.col === 1);
    expect(pushes).toEqual([{ type: 'push', handIndex: 0, row: 1, col: 1, direction: 'N' }]);
  });

  it('push moves occupant one square and places new card in its spot', () => {
    const board = emptyBoard();
    board[1][1].placed = { card: card('x', ['N']), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const next = applyMove(state, { type: 'push', handIndex: 0, row: 1, col: 1, direction: 'E' });
    expect(next.board[1][1].placed?.card.id).toBe('a');
    expect(next.board[1][2].placed?.card.id).toBe('x');
  });

  it('chain push shifts a line of cards', () => {
    const board = emptyBoard();
    board[1][0].placed = { card: card('x', []), owner: 'red' };
    board[1][1].placed = { card: card('y', []), owner: 'blue' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const next = applyMove(state, { type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' });
    expect(next.board[1][0].placed?.card.id).toBe('a');
    expect(next.board[1][1].placed?.card.id).toBe('x');
    expect(next.board[1][2].placed?.card.id).toBe('y');
  });

  it('card pushed off the board is removed from play', () => {
    const board = emptyBoard();
    board[1][2].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const next = applyMove(state, { type: 'push', handIndex: 0, row: 1, col: 2, direction: 'E' });
    expect(next.board[1][2].placed?.card.id).toBe('a');
    // x is gone entirely
    const ids = next.board.flat().map((c) => c.placed?.card.id).filter(Boolean);
    expect(ids).not.toContain('x');
  });

  it('on a walled board, a push that would shove a card off the edge is illegal', () => {
    const board = emptyBoard();
    board[1][2].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])], walls: true });
    // No empty cell east of the occupant: the wall blocks the push entirely.
    expect(legalMoves(state)).not.toContainEqual<Move>({
      type: 'push', handIndex: 0, row: 1, col: 2, direction: 'E',
    });
  });

  it('on a walled board, a push with an in-bounds landing cell stays legal', () => {
    const board = emptyBoard();
    board[1][1].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])], walls: true });
    // (1,2) is empty and in-bounds, so the card has somewhere to slide.
    expect(legalMoves(state)).toContainEqual<Move>({
      type: 'push', handIndex: 0, row: 1, col: 1, direction: 'E',
    });
  });

  it('a card can be pushed ONTO a gem square (gem claim via push)', () => {
    const board = emptyBoard();
    board[1][1].gem = true;
    board[1][0].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const next = applyMove(state, { type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' });
    expect(next.board[1][1].placed?.card.id).toBe('x');
    expect(next.board[1][1].gem).toBe(true);
  });

  it('push is blocked when a deeper card in the chain has an opposing arrow', () => {
    const board = emptyBoard();
    board[1][0].placed = { card: card('x', []), owner: 'red' };
    board[1][1].placed = { card: card('y', ['W']), owner: 'red' }; // resists eastward push
    const state = makeState({ board, hand: [card('a', ['E'])] });
    expect(legalMoves(state)).not.toContainEqual<Move>({
      type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E',
    });
  });

  it('push is allowed when chain cards have only non-opposing arrows', () => {
    const board = emptyBoard();
    board[1][0].placed = { card: card('x', ['N']), owner: 'red' };
    board[1][1].placed = { card: card('y', ['E', 'S']), owner: 'blue' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    expect(legalMoves(state)).toContainEqual<Move>({
      type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E',
    });
  });

  it('pushing cannot target an empty square', () => {
    const state = makeState({ hand: [card('a', ['E'])] });
    const pushes = legalMoves(state).filter((m) => m.type === 'push');
    expect(pushes).toHaveLength(0);
  });
});
