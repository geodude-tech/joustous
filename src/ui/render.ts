import type { Card, Direction, GameState, Move } from '../engine/types';
import type { Pack } from '../engine/cards';
import type { Difficulty } from '../engine/ai';
import { countGems } from '../engine/game';
import { pushChain, previewPush } from '../engine/rules';

const ARROW_GLYPHS: Record<Direction, string> = { N: '▲', E: '▶', S: '▼', W: '◀' };
const SHEET_COLS = 12;
const CELL_STRIDE = 38;
const CELL_OFFSET = 2;
const SPRITE = 36;
const SHEET_W = 458;
const SHEET_H = 496;

export interface UiState {
  selectedHandIndex: number | null;
  draggingHand: boolean;
  pendingPush: { row: number; col: number; directions: Direction[]; armed: Direction | null } | null;
  message: string | null;
  aiCell: { row: number; col: number } | null;
  packSelect: boolean;
  showRules: boolean;
  difficulty: Difficulty;
  confirmExit: boolean;
}

export interface RenderCallbacks {
  onSelectHand(index: number): void;
  onCellTap(row: number, col: number): void;
  onPickDirection(direction: Direction): void;
  onNewGame(): void;
  onChoosePack(pack: Pack): void;
  onChooseDifficulty(difficulty: Difficulty): void;
  onCancelPush(): void;
  onToggleRules(show: boolean): void;
  onRequestExit(): void;
  onCancelExit(): void;
}

const DIFFICULTIES: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'easy', label: 'Easy' },
  { difficulty: 'medium', label: 'Medium' },
  { difficulty: 'hard', label: 'Hard' },
];

const PACKS: { pack: Pack; label: string; blurb: string }[] = [
  { pack: 'basic', label: 'Basic', blurb: 'Starter cards, single arrows — learn the ropes' },
  { pack: 'intermediate', label: 'Intermediate', blurb: 'Adds two-arrow cards' },
  { pack: 'advanced', label: 'Advanced', blurb: 'Full roster, triple-arrow cards' },
];

export function cardEl(card: Card, owner: 'blue' | 'red'): HTMLElement {
  const el = document.createElement('div');
  el.className = `card ${owner}`;
  el.dataset.cid = card.id;
  const portrait = document.createElement('div');
  portrait.className = 'portrait';
  const col = card.portraitIndex % SHEET_COLS;
  const row = Math.floor(card.portraitIndex / SHEET_COLS);
  // Percentage-based crop scales with the element size.
  const px = ((CELL_OFFSET + col * CELL_STRIDE) / (SHEET_W - SPRITE)) * 100;
  const py = ((CELL_OFFSET + row * CELL_STRIDE) / (SHEET_H - SPRITE)) * 100;
  portrait.style.backgroundPosition = `${px}% ${py}%`;
  el.appendChild(portrait);
  for (const dir of card.arrows) {
    const a = document.createElement('span');
    a.className = `arrow ${dir}`;
    a.textContent = ARROW_GLYPHS[dir];
    el.appendChild(a);
  }
  el.title = card.name;
  return el;
}

export function render(
  root: HTMLElement,
  state: GameState,
  ui: UiState,
  legalForSelection: Move[],
  cb: RenderCallbacks,
): void {
  root.innerHTML = '';

  const gems = countGems(state);

  // Status bar
  const status = document.createElement('div');
  status.className = 'status-bar';
  status.innerHTML = `
    <span class="gem-count blue">You: ${gems.blue}</span>
    <span class="turn-banner ${state.turn === 'red' ? 'red-turn' : ''}" data-testid="turn-banner">
      ${state.result ? 'Game over' : state.turn === 'blue' ? 'Your turn' : 'Enemy turn…'}
    </span>
    <span class="gem-count red">Foe: ${gems.red}</span>`;
  if (!state.result) {
    const exit = document.createElement('button');
    exit.className = 'exit-btn';
    exit.dataset.testid = 'exit-game';
    exit.textContent = '✕';
    exit.title = 'Exit to menu';
    exit.addEventListener('click', () => cb.onRequestExit());
    status.appendChild(exit);
  }
  root.appendChild(status);

  const game = document.createElement('div');
  game.className = 'game';

  // Cells whose cards would slide for the pending push: key "r,c" -> directions
  const slideMarks = new Map<string, Direction[]>();
  // Cards sliding off the board.
  const fallMarks = new Set<string>();
  if (ui.pendingPush) {
    const { row, col, directions, armed } = ui.pendingPush;
    if (armed) {
      const move = legalForSelection.find(
        (m) => m.type === 'push' && m.row === row && m.col === col && m.direction === armed,
      );
      if (move && move.type === 'push') {
        const preview = previewPush(state, move);
        for (const [r, c] of preview.chain) slideMarks.set(`${r},${c}`, [armed]);
        for (const [r, c] of preview.falls) fallMarks.add(`${r},${c}`);
      }
    } else {
      for (const dir of directions) {
        for (const [r, c] of pushChain(state.board, row, col, dir)) {
          const key = `${r},${c}`;
          slideMarks.set(key, [...(slideMarks.get(key) ?? []), dir]);
        }
      }
    }
  }

  // Board
  const board = document.createElement('div');
  board.className = 'board';
  board.dataset.testid = 'board';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = state.board[r][c];
      const cellEl = document.createElement('div');
      cellEl.className = 'cell';
      cellEl.dataset.row = String(r);
      cellEl.dataset.col = String(c);
      if (cell.gem) {
        cellEl.classList.add('gem-cell');
        const gem = document.createElement('span');
        gem.className = cell.placed ? 'gem-badge' : 'gem-icon';
        cellEl.appendChild(gem);
      }
      if (cell.placed) cellEl.appendChild(cardEl(cell.placed.card, cell.placed.owner));
      if (ui.aiCell && ui.aiCell.row === r && ui.aiCell.col === c) {
        cellEl.classList.add('ai-played');
      }

      const hasMove = legalForSelection.some((m) => m.row === r && m.col === c);
      if (hasMove && state.turn === 'blue' && !state.result) {
        cellEl.classList.add('legal-target');
        cellEl.addEventListener('click', () => cb.onCellTap(r, c));
      }

      const marks = slideMarks.get(`${r},${c}`);
      if (marks) {
        const ghost = document.createElement('span');
        ghost.className = 'slide-ghost';
        ghost.textContent = marks.map((d) => ARROW_GLYPHS[d]).join('');
        cellEl.appendChild(ghost);
      }
      if (fallMarks.has(`${r},${c}`)) {
        const doom = document.createElement('span');
        doom.className = 'doom-ghost';
        doom.textContent = '✕';
        cellEl.appendChild(doom);
      }

      if (ui.pendingPush && ui.pendingPush.row === r && ui.pendingPush.col === c) {
        const picker = document.createElement('div');
        picker.className = 'dir-picker';
        for (const dir of ui.pendingPush.directions) {
          const btn = document.createElement('button');
          btn.className = `d${dir.toLowerCase()}`;
          if (ui.pendingPush.armed === dir) btn.classList.add('armed');
          btn.textContent = ARROW_GLYPHS[dir];
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            cb.onPickDirection(dir);
          });
          picker.appendChild(btn);
        }
        const cancel = document.createElement('button');
        cancel.className = 'dc cancel';
        cancel.textContent = '✕';
        cancel.addEventListener('click', (e) => {
          e.stopPropagation();
          cb.onCancelPush();
        });
        picker.appendChild(cancel);
        cellEl.appendChild(picker);
      }
      board.appendChild(cellEl);
    }
  }

  // Foe panel (hands are public in Joustus)
  const foePanel = document.createElement('div');
  foePanel.className = 'panel foe';
  const foeHand = document.createElement('div');
  foeHand.className = 'hand foe-hand';
  foeHand.dataset.testid = 'foe-hand';
  for (const card of state.hands.red) foeHand.appendChild(cardEl(card, 'red'));
  const foeDeck = document.createElement('div');
  foeDeck.className = 'deck-info';
  foeDeck.textContent = `Foe deck: ${state.decks.red.length}`;
  foePanel.append(foeDeck, foeHand);

  // Your panel
  const youPanel = document.createElement('div');
  youPanel.className = 'panel you';
  const hand = document.createElement('div');
  hand.className = 'hand';
  hand.dataset.testid = 'hand';
  state.hands.blue.forEach((card, i) => {
    const el = cardEl(card, 'blue');
    el.dataset.handIndex = String(i);
    if (i === ui.selectedHandIndex) {
      el.classList.add('selected');
      if (ui.draggingHand) el.classList.add('drag-source');
    }
    el.addEventListener('click', () => cb.onSelectHand(i));
    hand.appendChild(el);
  });
  const yourDeck = document.createElement('div');
  yourDeck.className = 'deck-info';
  yourDeck.textContent = `Your deck: ${state.decks.blue.length}`;
  youPanel.append(hand, yourDeck);

  game.append(foePanel, board, youPanel);
  root.appendChild(game);

  // Message toast
  if (ui.message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = ui.message;
    root.appendChild(toast);
  }

  // Pack select overlay
  if (ui.packSelect) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.dataset.testid = 'pack-select';
    if (ui.showRules) {
      overlay.innerHTML = `<h1>How to Play</h1>`;
      const rules = document.createElement('div');
      rules.className = 'rules-panel';
      rules.dataset.testid = 'rules';
      rules.innerHTML = `
        <p><b>Goal:</b> hold the most gems when the game ends. A gem is held by
        whoever's card sits on its square.</p>
        <p><b>On your turn</b> you must play a card from your hand:</p>
        <ul>
          <li><b>Place</b> it on any empty square that has no gem.</li>
          <li><b>Push</b>: play it onto an occupied square in a direction your
          card has an arrow for. The card there (and any chain of cards behind
          it) slides one square.</li>
        </ul>
        <p><b>Blocking:</b> a push fails if any card in the chain has an arrow
        pointing back at you.</p>
        <p><b>Gems</b> can only be claimed by pushing a card onto a gem square
        — you can't place onto one directly.</p>
        <p><b>Off the board:</b> cards pushed off the edge are gone for good.</p>
        <p><b>Game ends</b> when the board is full or a player can't move or
        runs out of cards. Most gems wins; a tie is a draw.</p>`;
      overlay.appendChild(rules);
      const back = document.createElement('button');
      back.dataset.testid = 'rules-back';
      back.textContent = 'Back';
      back.addEventListener('click', () => cb.onToggleRules(false));
      overlay.appendChild(back);
      root.appendChild(overlay);
      return;
    }
    overlay.innerHTML = `<h1>Joustus</h1><p>Opponent</p>`;
    const diffRow = document.createElement('div');
    diffRow.className = 'diff-row';
    for (const { difficulty, label } of DIFFICULTIES) {
      const btn = document.createElement('button');
      btn.className = 'diff-btn';
      if (ui.difficulty === difficulty) btn.classList.add('selected');
      btn.dataset.testid = `diff-${difficulty}`;
      btn.textContent = label;
      btn.addEventListener('click', () => cb.onChooseDifficulty(difficulty));
      diffRow.appendChild(btn);
    }
    overlay.appendChild(diffRow);
    const packLabel = document.createElement('p');
    packLabel.textContent = 'Choose a card pack';
    overlay.appendChild(packLabel);
    for (const { pack, label, blurb } of PACKS) {
      const btn = document.createElement('button');
      btn.className = 'pack-btn';
      btn.dataset.testid = `pack-${pack}`;
      btn.innerHTML = `${label}<small>${blurb}</small>`;
      btn.addEventListener('click', () => cb.onChoosePack(pack));
      overlay.appendChild(btn);
    }
    const rulesBtn = document.createElement('button');
    rulesBtn.className = 'rules-btn';
    rulesBtn.dataset.testid = 'show-rules';
    rulesBtn.textContent = 'How to Play';
    rulesBtn.addEventListener('click', () => cb.onToggleRules(true));
    overlay.appendChild(rulesBtn);
    root.appendChild(overlay);
    return;
  }

  // Exit confirmation overlay
  if (ui.confirmExit) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.dataset.testid = 'confirm-exit';
    overlay.innerHTML = `<h1>Abandon this game?</h1>`;
    const row = document.createElement('div');
    row.className = 'confirm-row';
    const abandon = document.createElement('button');
    abandon.dataset.testid = 'confirm-exit-yes';
    abandon.textContent = 'Abandon';
    abandon.addEventListener('click', () => cb.onNewGame());
    const keep = document.createElement('button');
    keep.dataset.testid = 'confirm-exit-no';
    keep.textContent = 'Keep playing';
    keep.addEventListener('click', () => cb.onCancelExit());
    row.append(abandon, keep);
    overlay.appendChild(row);
    root.appendChild(overlay);
    return;
  }

  // End overlay
  if (state.result) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.dataset.testid = 'overlay';
    const title =
      state.result.winner === 'blue' ? 'Victory!' : state.result.winner === 'red' ? 'Defeat…' : 'Draw';
    const detail =
      state.result.reason === 'deck-out'
        ? 'A player ran out of cards.'
        : `Gems — You: ${state.result.gems.blue} · Foe: ${state.result.gems.red}`;
    overlay.innerHTML = `<h1>${title}</h1><p>${detail}</p>`;
    const btn = document.createElement('button');
    btn.textContent = 'New Game';
    btn.addEventListener('click', () => cb.onNewGame());
    overlay.appendChild(btn);
    root.appendChild(overlay);
  }
}
