import type { Card, Direction, Player } from './types';

interface CardDef {
  name: string;
  arrows: Direction[];
  portraitIndex: number;
}

/**
 * Card pool inspired by the Joustus roster. Portrait indices map left-to-right,
 * top-to-bottom into joustus_card_portraits.png (14 columns).
 */
export const CARD_POOL: CardDef[] = [
  { name: 'Shovel Knight', arrows: ['N', 'E', 'W'], portraitIndex: 0 },
  { name: 'Specter Knight', arrows: ['N', 'S', 'E'], portraitIndex: 1 },
  { name: 'Plague Knight', arrows: ['E', 'W'], portraitIndex: 2 },
  { name: 'King Knight', arrows: ['N', 'E', 'S'], portraitIndex: 3 },
  { name: 'Treasure Knight', arrows: ['S', 'W'], portraitIndex: 4 },
  { name: 'Mole Knight', arrows: ['S', 'E'], portraitIndex: 5 },
  { name: 'Tinker Knight', arrows: ['N'], portraitIndex: 6 },
  { name: 'Polar Knight', arrows: ['N', 'W'], portraitIndex: 7 },
  { name: 'Propeller Knight', arrows: ['N', 'E'], portraitIndex: 8 },
  { name: 'Black Knight', arrows: ['N', 'S'], portraitIndex: 9 },
  { name: 'Skeleton', arrows: ['W'], portraitIndex: 10 },
  { name: 'Skull Fiend', arrows: ['S'], portraitIndex: 11 },
  { name: 'Goldarmor', arrows: ['E'], portraitIndex: 14 },
  { name: 'Frog', arrows: ['N', 'W', 'S'], portraitIndex: 15 },
  { name: 'Blorb', arrows: ['S', 'W', 'E'], portraitIndex: 16 },
  { name: 'Rat', arrows: ['W', 'E'], portraitIndex: 17 },
  { name: 'Beeto', arrows: ['N', 'S', 'W'], portraitIndex: 18 },
  { name: 'Bubble Dragon', arrows: ['E', 'S'], portraitIndex: 19 },
  { name: 'Diver', arrows: ['W', 'S'], portraitIndex: 20 },
  { name: 'Wizzem', arrows: ['N', 'E', 'S'], portraitIndex: 21 },
  { name: 'Gulper', arrows: ['W', 'N'], portraitIndex: 22 },
  { name: 'Hover Meanie', arrows: ['E', 'N'], portraitIndex: 23 },
  { name: 'Dozedrake', arrows: ['S', 'N'], portraitIndex: 24 },
  { name: 'Liquid Samurai', arrows: ['E', 'W', 'N'], portraitIndex: 25 },
  { name: 'Boneclang', arrows: ['N'], portraitIndex: 28 },
  { name: 'Birder', arrows: ['E'], portraitIndex: 29 },
  { name: 'Fleeto', arrows: ['S'], portraitIndex: 30 },
  { name: 'Mawful', arrows: ['W'], portraitIndex: 31 },
  { name: 'Cogslotter', arrows: ['N', 'E'], portraitIndex: 32 },
  { name: 'Spinwulf', arrows: ['S', 'W'], portraitIndex: 33 },
  { name: 'Griffoth', arrows: ['N', 'S', 'E'], portraitIndex: 34 },
  { name: 'Plume', arrows: ['E', 'W', 'S'], portraitIndex: 35 },
];

export const DECK_SIZE = 16;

export type Pack = 'basic' | 'intermediate' | 'advanced';

const PACK_MAX_ARROWS: Record<Pack, number> = { basic: 1, intermediate: 2, advanced: 3 };

export function buildDeck(owner: Player, random: () => number, pack: Pack = 'advanced'): Card[] {
  const defs = CARD_POOL.filter((d) => d.arrows.length <= PACK_MAX_ARROWS[pack]);
  // Repeat the filtered pool so small pools (basic) can still fill a deck.
  const pool: CardDef[] = [];
  while (pool.length < DECK_SIZE) pool.push(...defs);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DECK_SIZE).map((def, i) => ({
    id: `${owner}-${i}-${def.name}`,
    name: def.name,
    arrows: def.arrows,
    portraitIndex: def.portraitIndex,
  }));
}
