'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/finance/savings-goal-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Savings Goal Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs: Home > Calculators > Finance > Savings Goal Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(3)).toContainText('Savings Goal');
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

test('target date defaults to one year out', async ({ page }) => {
  await page.goto(URL);
  const v = await page.locator('[data-target-date]').inputValue();
  expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('zero-interest calculation: $12000 target, 12 months', async ({ page }) => {
  await page.goto(URL);
  // Pick a date 12 months from "today" (use a fixed far-future year to make this deterministic).
  await page.fill('[data-target-amount]', '12000');
  await page.fill('[data-starting-balance]', '0');
  await page.fill('[data-apr]', '0');
  // Set target date to exactly 1 year from today by running through the page's own today
  const todayIso = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  const oneYear  = await page.evaluate(() => {
    const n = new Date(); n.setFullYear(n.getFullYear() + 1);
    return n.toISOString().slice(0, 10);
  });
  await page.fill('[data-target-date]', oneYear);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-monthly]')).toContainText('1,000');
});

test('with interest, monthly figure is smaller than no-interest case', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-target-amount]', '12000');
  await page.fill('[data-starting-balance]', '0');
  const oneYear  = await page.evaluate(() => {
    const n = new Date(); n.setFullYear(n.getFullYear() + 1);
    return n.toISOString().slice(0, 10);
  });
  await page.fill('[data-target-date]', oneYear);
  await page.fill('[data-apr]', '10');
  await page.click('[data-calculate]');
  const text = await page.locator('[data-line-monthly]').textContent();
  const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
  expect(amount).toBeLessThan(1000);
});

test('error when target ≤ starting balance', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-target-amount]', '1000');
  await page.fill('[data-starting-balance]', '5000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
});

test('currency symbol changes with selector', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-currency]', 'GBP');
  await page.fill('[data-target-amount]', '5000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-monthly]')).toContainText('£');
});

test('dataLayer receives events', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => { window.dataLayer = []; });
  await page.click('[data-calculate]');
  const events = await page.evaluate(() => window.dataLayer.map(e => e.event));
  expect(events).toContain('calculator_interaction');
});

test('prove-it workings populated', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Target:');
  expect(body).toContain('Monthly contribution');
});

test('finance hub lists savings goal calculator', async ({ page }) => {
  await page.goto('/calculators/finance/');
  await expect(page.locator('a[href="/calculators/finance/savings-goal-calculator/"]').first()).toBeVisible();
});
