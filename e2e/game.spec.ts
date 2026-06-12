import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('pack-basic').click();
});

test('pack select shows three options and starts the chosen game', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('pack-select')).toBeVisible();
  await expect(page.locator('.pack-btn')).toHaveCount(3);
  await page.screenshot({ path: 'e2e/screenshots/00-pack-select.png' });
  await page.getByTestId('pack-intermediate').click();
  await expect(page.getByTestId('pack-select')).not.toBeVisible();
  await expect(page.getByTestId('board')).toBeVisible();
});

test('rules can be viewed from pack select and dismissed', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('show-rules').click();
  await expect(page.getByTestId('rules')).toBeVisible();
  await expect(page.getByTestId('rules')).toContainText('Goal');
  await page.screenshot({ path: 'e2e/screenshots/06-rules.png' });
  await page.getByTestId('rules-back').click();
  await expect(page.getByTestId('rules')).toHaveCount(0);
  await expect(page.getByTestId('pack-basic')).toBeVisible();
});

test('board, hands and status render on mobile viewport', async ({ page }) => {
  await expect(page.getByTestId('board')).toBeVisible();
  await expect(page.locator('.cell')).toHaveCount(9);
  await expect(page.locator('.gem-icon')).toHaveCount(3);
  await expect(page.locator('[data-testid="hand"] .card')).toHaveCount(3);
  await expect(page.locator('[data-testid="foe-hand"] .card')).toHaveCount(3);
  await page.screenshot({ path: 'e2e/screenshots/01-initial.png' });
});

test('landscape orientation puts panels beside the board', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const board = page.getByTestId('board');
  await expect(board).toBeVisible();
  const boardBox = (await board.boundingBox())!;
  const handBox = (await page.getByTestId('hand').boundingBox())!;
  const foeBox = (await page.getByTestId('foe-hand').boundingBox())!;
  // your hand left of board, foe hand right of board
  expect(handBox.x + handBox.width).toBeLessThanOrEqual(boardBox.x + 1);
  expect(foeBox.x).toBeGreaterThanOrEqual(boardBox.x + boardBox.width - 1);
  await page.screenshot({ path: 'e2e/screenshots/04-landscape.png' });
});

async function waitForMyTurn(page: Page): Promise<boolean> {
  const banner = page.getByTestId('turn-banner');
  for (let i = 0; i < 30; i++) {
    const text = (await banner.textContent()) ?? '';
    if (text.includes('Your turn')) return true;
    if (text.includes('Game over')) return false;
    await page.waitForTimeout(300);
  }
  throw new Error('turn never resolved');
}

async function playOneMove(page: Page): Promise<boolean> {
  if (!(await waitForMyTurn(page))) return false;
  const handCards = page.locator('[data-testid="hand"] .card');
  const n = await handCards.count();
  for (let i = 0; i < n; i++) {
    await handCards.nth(i).click();
    const targets = page.locator('.cell.legal-target');
    if ((await targets.count()) > 0) {
      await targets.first().click();
      const picker = page.locator('.dir-picker button');
      if ((await picker.count()) > 0) {
        await picker.first().click();
        // Multi-direction pushes arm on the first tap and confirm on the second.
        if ((await page.locator('.dir-picker').count()) > 0) await picker.first().click();
      }
      return true;
    }
  }
  throw new Error('no legal move found in UI for any hand card');
}

test('human can select a card and play a move', async ({ page }) => {
  await waitForMyTurn(page);
  // Board count can stay flat if the move pushes a card off the edge,
  // so assert on the deck counter, which always drops by one per move.
  const deckText = (await page.locator('.panel.you .deck-info').textContent())!;
  const before = Number(deckText.match(/\d+/)![0]);
  await playOneMove(page);
  await expect(page.locator('.panel.you .deck-info')).toHaveText(`Your deck: ${before - 1}`);
  await page.screenshot({ path: 'e2e/screenshots/02-after-move.png' });
});

test('push preview shows picker with chain ghost and can be cancelled', async ({ page }) => {
  test.setTimeout(120_000);
  // Play moves until a push target (occupied legal square) is available.
  for (let turn = 0; turn < 15; turn++) {
    if (!(await waitForMyTurn(page))) break;
    const handCards = page.locator('[data-testid="hand"] .card');
    const n = await handCards.count();
    let pushed = false;
    for (let i = 0; i < n && !pushed; i++) {
      await handCards.nth(i).click();
      const occupiedTargets = page.locator('.cell.legal-target:has(.card)');
      if ((await occupiedTargets.count()) > 0) {
        await occupiedTargets.first().click();
        await expect(page.locator('.dir-picker')).toBeVisible();
        await expect(page.locator('.slide-ghost').first()).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/05-push-preview.png' });
        // Cancel restores the board
        await page.locator('.dir-picker .cancel').click();
        await expect(page.locator('.dir-picker')).toHaveCount(0);
        return;
      }
    }
    // No push available: make a placement to advance the game.
    await playOneMove(page);
  }
  throw new Error('never found a push target');
});

test('full game vs AI reaches an end state', async ({ page }) => {
  test.setTimeout(180_000);
  for (let turn = 0; turn < 40; turn++) {
    const over = await page.getByTestId('overlay').isVisible();
    if (over) break;
    const played = await playOneMove(page);
    if (!played) break;
  }
  await expect(page.getByTestId('overlay')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'e2e/screenshots/03-game-over.png' });
});
