# Joustus — Game Dynamics

Joustus is the in-universe card game featured in *Shovel Knight: King of Cards*. It is a turn-based, push-mechanic board game played on a small grid, where the objective is to claim more gems than your opponent.

## Objective

Claim more gems than your opponent by the time the board fills up. A gem is claimed by pushing one of your cards onto its square — you cannot claim a gem by directly placing a card on it.

## Setup

- **Board**: Typically 2x2 or 3x3 of playable squares, surrounded by a ring of graveyard squares.
- **Gems**: A subset of board squares contain gems. Layouts may be:
  - **Fixed** — gem positions are consistent across matches.
  - **Random** — gems are placed randomly each match.
  - **Semi-random** — constrained patterns (e.g., always an L-shape in one corner).
- **Hand**: Each player always holds 3 cards. Drawn from a personal deck.
- **First player**: Determined by coin toss.

## Turn Structure

Players alternate turns. On your turn you must either:

1. **Place** a card on an empty square, OR
2. **Push** an existing card by placing a card adjacent to it whose arrow points into it (if the push is legal — see arrow rules below).

You **may not pass**. If a legal move exists, you must make one — even if it hurts you.

## Card Mechanics

### Arrows

Cards have between 1 and 3 directional arrows printed on their faces. Arrows determine:

- Which directions the card can **push** other cards.
- Which directions the card **resists** being pushed from.

**Push resolution rule**: An arrow is blocked if the target card has an arrow pointing in the opposite direction (e.g., your `→` cannot push a card that has a `←`). Otherwise, the target card slides one square in the push direction.

### Arrow counts

- **1-arrow cards** — minimal pushing power; weakest tier.
- **2-arrow cards** — balanced offensive utility.
- **3-arrow cards** — dominant; very hard to dislodge once placed on a gem. Cards like *Big Bohto* are considered top-tier for locking gems.

### Special card types

- **Cascade cards**: When claimed/converted by an opponent, trigger a chain reaction — the card immediately pushes onto an adjacent gem on the new owner's behalf.
- **Slam / Grave cards**: Interact with the graveyard squares surrounding the board, enabling unusual board manipulation. AI opponents tend to underutilize these.
- **Blocker cards**: Hard to push; used to lock down gems by parking them on top of a gem with arrows that cannot be countered.

## Gem Control

### Locking down a gem

A gem is "locked down" when the card sitting on it cannot be pushed off by any arrow combination still available — either because the card's arrow profile defeats every legal push, or because no adjacent square can be reached to push it. Once locked, that gem is yours for the remainder of the match.

### Stealing a gem

To take a gem currently held by an opponent's card, you must:

1. Reach an adjacent square from which your arrow can push their card.
2. Have an arrow that is not blocked by an opposing arrow on their card.
3. Push their card off the gem and replace it with your own (often via the same move or a follow-up).

## End of Match

The match ends when no more legal moves exist (the board is full of cards that cannot be pushed further into legal positions).

### Outcomes

- **Win**: You hold more gems than your opponent.
- **Draw**: Both players hold an equal number of gems.
- **Gem Sweep**: You hold every gem on the board. Instead of stealing a single card, you take one card from your opponent's board placement for **every gem** on the board.
- **Deck Loss**: If you ever run out of cards in your deck, you lose immediately.

### Rewards

- **Winner** chooses one of the loser's cards (from the cards they played on the board) to take permanently.
- **Loser** can buy back their lost card from the merchant Chester for a fee.

## Strategic Principles

- **Approach gems pointing toward them**, not away — your card's arrows should be oriented so they can push *onto* the gem, not waste arrows pointing into open space.
- **Read the opponent's hand**: Before committing to a gem, check whether they have arrows that could counter-push your card off.
- **Lock early when possible**: A 3-arrow card on a gem, with opposing arrows on the relevant sides, is often unbeatable.
- **Card farming**: Opponents have infinite card supplies, so re-challenging is risk-free for deck refinement.
- **Mind the forced-move rule**: Sometimes the best play is a setup that *forces* the opponent into a disadvantageous move because they cannot pass.

## Quick Reference

| Concept       | Rule                                                       |
| ------------- | ---------------------------------------------------------- |
| Hand size     | 3 cards                                                    |
| Board sizes   | 2x2 or 3x3, with graveyard border                          |
| Claim a gem   | Push a card onto it (not direct placement)                 |
| Arrow blocks  | Opposing arrow on target blocks the push                   |
| Forced move   | No passing; must move if any legal move exists             |
| Lose deck     | Empty deck = automatic loss                                |
| Gem Sweep     | All gems → steal one card per gem on the board             |
| Reward        | Winner takes one of the loser's played cards               |
