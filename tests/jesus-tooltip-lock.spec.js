import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

// Helper: open the page and wait for the canvas to be ready.
async function openPage(page) {
  const pagePath = path.resolve('generated/JesusFamilyTree/index.html');
  await page.goto(pathToFileURL(pagePath).href);
  await expect(page.locator('#tlc')).toBeVisible();
}

// Helper: navigate to a person by index and wait for the active tooltip to show.
async function navTo(page, idx) {
  await page.evaluate((i) => window.navTo(i), idx);
  await expect(page.locator('#tip')).toBeVisible();
}

// Helper: pin the currently-visible active tooltip.
async function pinActiveTip(page) {
  await page.locator('#tip #tip-pin').dispatchEvent('mousedown');
}

test.describe('Tooltip pin independence', () => {

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  // Opening a new tooltip works even when the previous one is pinned.
  // The pinned tooltip must become a stamped card and the active tooltip must
  // show the newly-requested person.
  test('opening a second tooltip while first is pinned stamps the first card and shows the second', async ({ page }) => {
    await openPage(page);
    const activeTip = page.locator('#tip');

    // Show Adam and pin him.
    await navTo(page, 0);
    await expect(activeTip.locator('#tip-name')).toHaveText('Adam');
    await pinActiveTip(page);
    await expect(page.locator('#tip #tip-pin')).toHaveText('🔒');

    // Show Seth while Adam is pinned — must succeed.
    await navTo(page, 1);
    await expect(activeTip).toBeVisible();
    await expect(activeTip.locator('#tip-name')).toHaveText('Seth');

    // Adam must now be a stamped card (no longer the active #tip).
    const cards = page.locator('.pinned-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first().locator('[id="tip-name"], .tip-name, [class*="name"]').first()).toHaveText('Adam');
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  // Each tooltip's lock state is independent.  Pinning the active tooltip does
  // NOT pin, unlock, or affect any stamped card, and vice-versa.
  test('pin state is independent between active tooltip and stamped cards', async ({ page }) => {
    await openPage(page);
    const activeTip = page.locator('#tip');

    // Pin Adam as a stamped card.
    await navTo(page, 0);
    await pinActiveTip(page);
    await navTo(page, 1); // Seth becomes active; Adam is stamped

    const adamCard = page.locator('.pinned-card').first();
    const adamCardPin = adamCard.locator('button:not(.pinned-card-close)').first();

    // Active tip (Seth) starts unlocked.
    await expect(page.locator('#tip #tip-pin')).toHaveText('🔓');

    // Pin Seth in the active tip — Adam card should remain unaffected (locked icon).
    await pinActiveTip(page);
    await expect(page.locator('#tip #tip-pin')).toHaveText('🔒');
    // Adam's card pin state is unchanged — it was already locked when stamped.
    await expect(adamCardPin).toHaveText('🔒');

    // Unlock Adam's stamped card — Seth's active tip pin must remain locked.
    await adamCardPin.dispatchEvent('mousedown');
    await expect(adamCardPin).toHaveText('🔓');
    await expect(page.locator('#tip #tip-pin')).toHaveText('🔒');
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  // Multiple tooltips can be pinned simultaneously.  Each pin produces exactly
  // one additional stamped card, and subsequent navTo still opens normally.
  test('multiple sequential pins produce independent stamped cards and active tooltip still opens', async ({ page }) => {
    await openPage(page);
    const activeTip = page.locator('#tip');

    // Pin Adam → Seth → Enosh in sequence.
    await navTo(page, 0); await pinActiveTip(page); // Adam pinned
    await navTo(page, 1); await pinActiveTip(page); // Seth pinned
    await navTo(page, 2); await pinActiveTip(page); // Enosh pinned

    // Three stamped cards must exist.
    await expect(page.locator('.pinned-card')).toHaveCount(3);

    // Opening a fourth person (index 3) must still work regardless of the three pinned cards.
    await navTo(page, 3);
    await expect(activeTip).toBeVisible();
    // Active tooltip must show index 3 (Kenan), not any of the pinned people.
    const name = await activeTip.locator('#tip-name').textContent();
    expect(['Adam','Seth','Enosh']).not.toContain(name?.trim());
    // Card count must not increase from opening the fourth tooltip (no auto-pin).
    await expect(page.locator('.pinned-card')).toHaveCount(3);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  // Unlocking a stamped card does NOT close/affect other cards or the active tip.
  test('unlocking one stamped card leaves all other cards and active tip untouched', async ({ page }) => {
    await openPage(page);
    const activeTip = page.locator('#tip');

    // Stamp two cards then show a third active tooltip.
    await navTo(page, 0); await pinActiveTip(page); // Adam stamped
    await navTo(page, 1); await pinActiveTip(page); // Seth stamped
    await navTo(page, 2); // Enosh active, no pin

    const cards = page.locator('.pinned-card');
    await expect(cards).toHaveCount(2);
    await expect(activeTip.locator('#tip-name')).toHaveText('Enosh');

    // Unlock the first card (Adam).
    const firstCardPin = cards.first().locator('button:not(.pinned-card-close)').first();
    await firstCardPin.dispatchEvent('mousedown');
    await expect(firstCardPin).toHaveText('🔓');

    // Second card must still exist and remain locked.
    await expect(cards).toHaveCount(2);
    const secondCardPin = cards.nth(1).locator('button:not(.pinned-card-close)').first();
    await expect(secondCardPin).toHaveText('🔒');

    // Active tooltip must still show Enosh and remain independently unlocked.
    await expect(activeTip).toBeVisible();
    await expect(activeTip.locator('#tip-name')).toHaveText('Enosh');
    await expect(page.locator('#tip #tip-pin')).toHaveText('🔓');
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  // Hovering (simulated via navTo) still opens a tooltip when pinned cards exist —
  // proving that existing pin state does not block normal tooltip display.
  test('navTo opens tooltip normally regardless of how many cards are pinned', async ({ page }) => {
    await openPage(page);
    const activeTip = page.locator('#tip');

    // Stamp five cards back-to-back.
    for (let i = 0; i < 5; i++) {
      await navTo(page, i);
      await pinActiveTip(page);
    }
    await expect(page.locator('.pinned-card')).toHaveCount(5);

    // navTo on a fresh index must open successfully.
    await navTo(page, 5);
    await expect(activeTip).toBeVisible();
    const name = await activeTip.locator('#tip-name').textContent();
    expect(name?.trim().length).toBeGreaterThan(0);
    // Still only 5 cards — the 6th open did not auto-stamp.
    await expect(page.locator('.pinned-card')).toHaveCount(5);
  });
});
