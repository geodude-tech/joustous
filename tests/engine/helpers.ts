import type { Board, Card, Cell, Direction, GameState, Player } from '../../src/engine/types';
import { BOARD_SIZE } from '../../src/engine/types';

let cardCounter = 0;

export function card(id: string, arrows: Direction[]): Card {
  return { id, name: id, arrows, portraitIndex: cardCounter++ % 148 };
}

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, (): Cell => ({ gem: false, placed: null })),
  );
}

export function makeState(opts: {
  board?: Board;
  hand?: Card[];
  deck?: Card[];
  redHand?: Card[];
  redDeck?: Card[];
  turn?: Player;
  gems?: [number, number][];
} = {}): GameState {
  const board = opts.board ?? emptyBoard();
  for (const [r, c] of opts.gems ?? []) board[r][c].gem = true;
  return {
    board,
    hands: { blue: opts.hand ?? [], red: opts.redHand ?? [] },
    decks: { blue: opts.deck ?? [], red: opts.redDeck ?? [] },
    turn: opts.turn ?? 'blue',
    result: null,
  };
}
