import { describe, it, expect } from 'vitest';
import { emptyBoard, makeState, card } from './helpers';
import { previewPush } from '../../src/engine/rules';

describe('previewPush', () => {
  it('reports the chain and a gem claim when a card slides onto a gem', () => {
    const board = emptyBoard();
    board[1][1].gem = true;
    board[1][0].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const preview = previewPush(state, { type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' });
    expect(preview.chain).toEqual([[1, 0]]);
    expect(preview.claims).toEqual([{ row: 1, col: 1, owner: 'red' }]);
    expect(preview.falls).toEqual([]);
  });

  it('reports a gem steal when the mover lands on the vacated gem square', () => {
    const board = emptyBoard();
    board[1][1].gem = true;
    board[1][1].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const preview = previewPush(state, { type: 'push', handIndex: 0, row: 1, col: 1, direction: 'E' });
    expect(preview.claims).toEqual([{ row: 1, col: 1, owner: 'blue' }]);
  });

  it('reports a fall when the last card in the chain slides off the board', () => {
    const board = emptyBoard();
    board[1][2].placed = { card: card('x', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const preview = previewPush(state, { type: 'push', handIndex: 0, row: 1, col: 2, direction: 'E' });
    expect(preview.falls).toEqual([[1, 2]]);
    expect(preview.claims).toEqual([]);
  });

  it('handles a chain that both claims a gem and drops a card off the edge', () => {
    const board = emptyBoard();
    board[1][1].gem = true;
    board[1][0].placed = { card: card('x', []), owner: 'blue' };
    board[1][1].placed = { card: card('y', []), owner: 'red' };
    board[1][2].placed = { card: card('z', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const preview = previewPush(state, { type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' });
    expect(preview.chain).toEqual([[1, 0], [1, 1], [1, 2]]);
    // x (blue) slides onto the gem at (1,1), z slides off the east edge
    expect(preview.claims).toEqual([{ row: 1, col: 1, owner: 'blue' }]);
    expect(preview.falls).toEqual([[1, 2]]);
  });

  it('does not report a claim when gem ownership is unchanged', () => {
    const board = emptyBoard();
    board[1][1].gem = true;
    board[1][0].placed = { card: card('x', []), owner: 'red' };
    board[1][1].placed = { card: card('y', []), owner: 'red' };
    const state = makeState({ board, hand: [card('a', ['E'])] });
    const preview = previewPush(state, { type: 'push', handIndex: 0, row: 1, col: 0, direction: 'E' });
    expect(preview.claims).toEqual([]);
  });
});
