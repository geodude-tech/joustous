# Joustus

Mobile-web PWA implementation of the Joustus card game from *Shovel Knight: King of Cards*.
Vanilla TypeScript + Vite, no frameworks. Rules reference: `game_dynamics.md`.

## Commands

- `npm run dev` — dev server (add `-- --host` for LAN/phone testing)
- `npx vitest run` — unit tests (`tests/engine/`)
- `npx playwright test` — e2e suite (`e2e/game.spec.ts`); starts its own dev server on port 5173, saves screenshots to `e2e/screenshots/`
- `npm run build` — `tsc` + production build with PWA manifest/service worker

## Architecture

- `src/engine/` is **pure logic, no DOM** — `applyMove(state, move) -> state`. Every rule change goes here with a unit test first (project is TDD).
  - `types.ts` — `Direction` N/E/S/W, `Player` 'blue' (human) / 'red' (AI), `GameState`, `Move` (place | push)
  - `rules.ts` — `legalMoves`, `applyMove`, chain-push resolution; a push is blocked if **any** card in the chain has the opposing arrow
  - `game.ts` — `checkEnd`: deck-out loss, board-full / no-moves → most gems wins
  - `cards.ts` — card pool + packs (`basic`=1 arrow, `intermediate`=≤2, `advanced`=all); deck of 16, hand of 3
  - `ai.ts` — alpha-beta minimax; depth = difficulty (easy 1 / medium 2 / hard 3), leaf eval gems/material/gem-adjacency, small root tempo bonus, random tie-break
- `src/ui/render.ts` — full re-render per state change; `src/main.ts` wires callbacks, AI turn (1100 ms delay), and FLIP animations keyed on `data-cid`.
- Gems are claimed only by *pushing* a card onto a gem square; direct placement on gem squares is illegal.

## Sprite sheet

`public/cards/portraits.png` (chroma-keyed from `art/joustus_card_portraits.png` via
`scripts/make-portraits.mjs`): sheet 458×496, 36×36 sprites, 38 px stride, 2 px offset,
12 columns. UI crops with **percentage-based** `background-position`/`background-size`
(CSS `scale(calc(len/num))` is invalid — don't switch back). `scripts/make-icons.mjs`
regenerates the PWA icons (the rat portrait, index 0 — keep it; user likes it).

## Testing notes

- Vitest only collects `tests/**` (set in `vite.config.ts`) — keep e2e specs out of it.
- Playwright uses iPhone 13 viewport with `browserName: 'chromium'` (the device profile defaults to WebKit, which isn't installed).
- Don't assert on board card count after a move — pushes off the edge keep it flat; assert on the deck counter instead.

## Deploy

Push to `main` auto-deploys: `.github/workflows/deploy.yml` runs vitest, builds, and
publishes `dist/` to GitHub Pages at https://geodude-tech.github.io/joustous/.
`vite.config.ts` uses `base: './'` so the app works under the `/joustous/` subpath —
keep paths relative.

Workflow: each feature increment is its own commit, committed and pushed only after
the user approves it.
