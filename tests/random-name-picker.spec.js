'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/fun/random-name-picker/';

test.describe('Random Name Picker page', () => {
  test('has the expected h1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Random Name Picker' })).toBeVisible();
  });

  test('has ELI5 section', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.eli5')).toBeVisible();
  });

  test('breadcrumb: Home > Calculators > Fun > Random Name Picker', async ({ page }) => {
    await page.goto(URL);
    const crumbs = page.locator('.breadcrumbs ol li');
    await expect(crumbs).toHaveCount(4);
    await expect(crumbs.nth(2)).toContainText('Fun');
    await expect(crumbs.nth(3)).toContainText('Random Name Picker');
  });

  test('live count updates as the user types', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice\nBob\nCarol');
    await expect(page.locator('[data-picker-count]')).toContainText('3 names entered');
  });

  test('reports deduped entries', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice\nAlice\nBob');
    await expect(page.locator('[data-picker-count]')).toContainText('Deduped 1');
  });

  test('empty list shows validation error', async ({ page }) => {
    await page.goto(URL);
    await page.click('[data-picker-pick]');
    await expect(page.locator('[data-picker-error]')).toBeVisible();
    await expect(page.locator('[data-picker-error]')).toContainText(/at least one name/i);
  });

  test('pick count exceeds list size with no duplicates: validation error', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice\nBob');
    await page.fill('[data-picker-pick-count]', '5');
    await page.click('[data-picker-pick]');
    await expect(page.locator('[data-picker-error]')).toBeVisible();
    await expect(page.locator('[data-picker-error]')).toContainText('only have 2 names');
  });

  test('pick count exceeds list size with duplicates allowed: works', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice');
    await page.fill('[data-picker-pick-count]', '4');
    await page.check('[data-picker-allow-duplicates]');
    await page.click('[data-picker-pick]');
    await expect(page.locator('[data-picker-error]')).toBeHidden();
    const items = page.locator('[data-picker-list] li');
    await expect(items).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(items.nth(i)).toHaveText('Alice');
    }
  });

  test('single name pick 1 returns that name', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Solo');
    await page.click('[data-picker-pick]');
    const items = page.locator('[data-picker-list] li');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toHaveText('Solo');
  });

  test('pick without duplicates returns unique entries', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice\nBob\nCarol\nDave\nEve');
    await page.fill('[data-picker-pick-count]', '5');
    await page.click('[data-picker-pick]');
    const items = page.locator('[data-picker-list] li');
    await expect(items).toHaveCount(5);
    const texts = await items.allTextContents();
    const set = new Set(texts);
    expect(set.size).toBe(5);
    ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'].forEach(n => {
      expect(set.has(n)).toBe(true);
    });
  });

  test('Pick again button redraws', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice\nBob\nCarol\nDave\nEve\nFrank\nGrace\nHeidi');
    await page.fill('[data-picker-pick-count]', '3');
    await page.click('[data-picker-pick]');
    const first = await page.locator('[data-picker-list] li').allTextContents();
    expect(first.length).toBe(3);
    // Try a few redraws to find a different result. Same outcome twice in a
    // row is possible but unlikely on a list of 8 with 3 picks.
    let differs = false;
    for (let i = 0; i < 5; i++) {
      await page.click('[data-picker-again]');
      const next = await page.locator('[data-picker-list] li').allTextContents();
      if (next.join('|') !== first.join('|')) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });

  test('whitespace-only lines are stripped from the count', async ({ page }) => {
    await page.goto(URL);
    await page.fill('[data-picker-names]', 'Alice\n   \n\n\tBob\nCarol');
    await expect(page.locator('[data-picker-count]')).toContainText('3 names entered');
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

  test('page does not exfiltrate the typed names', async ({ page }) => {
    const SECRET = 'unique-name-marker-9f3a2b';
    const offending = [];
    page.on('request', (req) => {
      const u = req.url();
      const body = req.postData() || '';
      if (u.includes(SECRET) || body.includes(SECRET)) {
        offending.push(u);
      }
    });
    await page.goto(URL);
    await page.fill('[data-picker-names]', SECRET);
    await page.click('[data-picker-pick]');
    await page.waitForTimeout(400);
    expect(offending).toEqual([]);
  });
});

test.describe('Random Name Picker hub registration', () => {
  test('Fun hub lists the Random Name Picker', async ({ page }) => {
    await page.goto('/calculators/fun/');
    await expect(page.getByRole('link', { name: 'Random Name Picker', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the Random Name Picker', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Random Name Picker', includeHidden: true }).first()).toBeVisible();
  });
});
