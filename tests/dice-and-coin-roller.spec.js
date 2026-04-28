'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/fun/dice-and-coin-roller/';

test.describe('Dice and Coin Roller page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Dice and Coin Roller' })).toBeVisible();
  });

  test('has ELI5 section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('breadcrumb: Home > Calculators > Fun > Dice and Coin Roller', async ({ page }) => {
    await page.goto(URL);
    const crumbs = page.locator('.breadcrumbs ol li');
    await expect(crumbs).toHaveCount(4);
    await expect(crumbs.nth(2)).toContainText('Fun');
    await expect(crumbs.nth(3)).toContainText('Dice and Coin Roller');
  });

  test('rolling 1d20 produces a total within range', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-dice-notation]', '1d20');
    await page.click('[data-dice-roll]');
    const total = page.locator('[data-roll-detail] .result-display');
    await expect(total).toContainText('Total:');
    const text = await total.textContent();
    const match = text.match(/Total:\s*(-?\d+)/);
    expect(match).not.toBeNull();
    const n = parseInt(match[1], 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(20);
  });

  test('preset button rolls immediately', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-dice-preset="1d6"]');
    await expect(page.locator('[data-roll-status]')).toContainText('Rolled 1d6');
    const text = await page.locator('[data-roll-detail] .result-display').textContent();
    const m = text.match(/Total:\s*(\d+)/);
    expect(m).not.toBeNull();
    const n = parseInt(m[1], 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(6);
  });

  test('invalid notation shows an error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-dice-notation]', 'xyz');
    await page.click('[data-dice-roll]');
    await expect(page.locator('[data-roll-error]')).toBeVisible();
  });

  test('keep-highest 4d6kh3 reports a kept subset', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-dice-notation]', '4d6kh3');
    await page.click('[data-dice-roll]');
    await expect(page.locator('[data-roll-detail]')).toContainText('Kept');
  });

  test('switching to coin mode then flipping reports heads and tails', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-mode-tab="coin"]');
    await page.fill('[data-coin-count]', '10');
    await page.click('[data-coin-flip]');
    const detail = await page.locator('[data-roll-detail] .result-display').textContent();
    expect(detail).toMatch(/heads/);
    expect(detail).toMatch(/tails/);
    const m = detail.match(/(\d+)\s*heads,\s*(\d+)\s*tails/);
    expect(m).not.toBeNull();
    expect(parseInt(m[1], 10) + parseInt(m[2], 10)).toBe(10);
  });

  test('coin mode with N > 50 omits the per-flip sequence', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-mode-tab="coin"]');
    await page.fill('[data-coin-count]', '200');
    await page.click('[data-coin-flip]');
    const detail = await page.locator('[data-roll-detail]').textContent();
    expect(detail).toMatch(/omitted/i);
  });

  test('coin mode with N <= 50 shows the per-flip sequence', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-mode-tab="coin"]');
    await page.fill('[data-coin-count]', '5');
    await page.click('[data-coin-flip]');
    const flips = page.locator('[data-roll-detail] .coin-flip');
    await expect(flips).toHaveCount(5);
  });

  test('history records the last rolls and Clear button empties it', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-dice-preset="1d6"]');
    await page.click('[data-dice-preset="1d20"]');
    const items = page.locator('[data-history-list] li');
    await expect(items).toHaveCount(2);
    await page.click('[data-history-clear]');
    await expect(items).toHaveCount(0);
    await expect(page.locator('[data-history-empty]')).toBeVisible();
  });

  test('prove-it block is present and contains the algorithm', async ({ page }) => {
    await page.goto(URL);
    const prove = page.locator('[data-prove-it]');
    await expect(prove).toBeVisible();
    await expect(prove).toContainText('crypto.getRandomValues');
    await expect(prove).toContainText('rejection sampling');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication category is GameApplication', async ({ page }) => {
    await page.goto(URL);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa.applicationCategory).toBe('GameApplication');
  });

  test('does not exfiltrate the notation entered', async ({ page }) => {
    const SECRET = '7d13kh2';
    const offending = [];
    page.on('request', (req) => {
      const u = req.url();
      const body = req.postData() || '';
      if (u.includes(SECRET) || body.includes(SECRET)) {
        offending.push(u);
      }
    });
    await page.goto(URL);
    await page.fill('[data-dice-notation]', SECRET);
    await page.click('[data-dice-roll]');
    await page.waitForTimeout(400);
    expect(offending).toEqual([]);
  });
});

test.describe('Dice and Coin Roller hub registration', () => {
  test('Fun hub lists the Dice and Coin Roller', async ({ page }) => {
    await page.goto('/calculators/fun/');
    await expect(page.getByRole('link', { name: 'Dice and Coin Roller', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Dice and Coin Roller', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Dice and Coin Roller', includeHidden: true }).first()).toBeVisible();
  });
});
