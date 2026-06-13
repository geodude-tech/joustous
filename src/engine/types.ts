export type Direction = 'N' | 'E' | 'S' | 'W';

export type Player = 'blue' | 'red';

export interface Card {
  id: string;
  name: string;
  arrows: Direction[];
  portraitIndex: number;
}

export interface PlacedCard {
  card: Card;
  owner: Player;
}

export interface Cell {
  gem: boolean;
  placed: PlacedCard | null;
  /** Out-of-bounds ring cell (walled boards): cannot be placed on or pushed
   *  from, but a card can be pushed *into* it once. The outer edge past the
   *  ring is a hard wall, so a card here cannot be shoved any further. */
  oob?: boolean;
}

export const BOARD_SIZE = 3;

/** Board is row-major: board[row][col], row 0 = top (north). */
export type Board = Cell[][];

export interface GameState {
  board: Board;
  hands: Record<Player, Card[]>;
  decks: Record<Player, Card[]>;
  turn: Player;
  /** Gem cells whose owner changed on the previous move. */
  justFlipped?: [number, number][];
  /** Walled board (basic mode): the edge is solid, so a push that would shove
   *  a card off the board is illegal instead of removing the card. */
  walls?: boolean;
  /** Set when the game has ended. */
  result: GameResult | null;
}

export interface GameResult {
  winner: Player | null; // null = draw
  reason: 'gems' | 'deck-out';
  gems: Record<Player, number>;
}

export interface PlaceMove {
  type: 'place';
  handIndex: number;
  row: number;
  col: number;
}

export interface PushMove {
  type: 'push';
  handIndex: number;
  row: number;
  col: number;
  direction: Direction;
}

export type Move = PlaceMove | PushMove;

export const DELTAS: Record<Direction, [number, number]> = {
  N: [-1, 0],
  E: [0, 1],
  S: [1, 0],
  W: [0, -1],
};

export const OPPOSITE: Record<Direction, Direction> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

export function otherPlayer(p: Player): Player {
  return p === 'blue' ? 'red' : 'blue';
}
