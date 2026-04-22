'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/finance/tip-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Tip Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs: Home > Calculators > Finance > Tip Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Finance');
  await expect(crumbs.nth(3)).toContainText('Tip Calculator');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('currency defaults to USD', async ({ page }) => {
  await page.goto(URL);
  const v = await page.locator('[data-currency]').inputValue();
  expect(v).toBe('USD');
});

test('basic calculation: $100, 20%, 1 person', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-bill-total]', '100');
  await page.fill('[data-tip-percent]', '20');
  await page.fill('[data-split-between]', '1');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-tip]')).toContainText('20.00');
  await expect(page.locator('[data-line-total]')).toContainText('120.00');
  await expect(page.locator('[data-line-pp-total]')).toContainText('120.00');
});

test('split between 4 people', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-bill-total]', '120');
  await page.fill('[data-tip-percent]', '20');
  await page.fill('[data-split-between]', '4');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-pp-total]')).toContainText('36.00');
});

test('currency symbol changes with selector', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-currency]', 'GBP');
  await page.fill('[data-bill-total]', '50');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total]')).toContainText('£');
});

test('round-up rounds per-person to whole unit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-bill-total]', '23.50');
  await page.fill('[data-tip-percent]', '18');
  await page.fill('[data-split-between]', '3');
  await page.check('[data-round-up]');
  await page.click('[data-calculate]');
  // 23.50 × 1.18 = 27.73; /3 = 9.24; rounded up to 10 each = 30 total
  await expect(page.locator('[data-line-pp-total]')).toContainText('10.00');
  await expect(page.locator('[data-line-total]')).toContainText('30.00');
});

test('dataLayer receives events', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => { window.dataLayer = []; });
  await page.fill('[data-bill-total]', '50');
  await page.click('[data-calculate]');
  const events = await page.evaluate(() => window.dataLayer.map(e => e.event));
  expect(events).toContain('calculator_interaction');
  expect(events).toContain('calculator_result');
});

test('prove-it workings populated', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-bill-total]', '100');
  await page.fill('[data-tip-percent]', '18');
  await page.click('[data-calculate]');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Bill before tip');
  expect(body).toContain('18%');
});

test('finance hub lists tip calculator', async ({ page }) => {
  await page.goto('/calculators/finance/');
  await expect(page.locator('a[href="/calculators/finance/tip-calculator/"]')).toBeVisible();
});
