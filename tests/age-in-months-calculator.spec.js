'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/fun/age-in-months-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Age in Months Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Fun > Age in Months Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Fun');
  await expect(crumbs.nth(3)).toContainText('Age in Months');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('today input defaults to today\'s date', async ({ page }) => {
  await page.goto(URL);
  const today = await page.locator('[data-today]').inputValue();
  expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('error shown when DOB missing', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('error shown when DOB is in the future', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-dob]', '2099-01-01');
  await page.fill('[data-today]', '2026-04-22');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
  await expect(page.locator('[data-error]')).toContainText(/future/i);
});

test('known result: 1985-06-15 to 2026-04-22 → 490 months', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-dob]', '1985-06-15');
  await page.fill('[data-today]', '2026-04-22');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-result]')).toContainText('490 months old');
  await expect(page.locator('[data-line-total-months]')).toContainText('490');
  await expect(page.locator('[data-line-ymd]')).toContainText('40 years, 10 months, 7 days');
});

test('exact one-month-old shows "1 month"', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-dob]', '2026-03-22');
  await page.fill('[data-today]', '2026-04-22');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-ymd]')).toContainText('0 years, 1 month, 0 days');
});

test('totalWeeks is totalDays divided by 7, rounded down', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-dob]', '2025-04-22');
  await page.fill('[data-today]', '2026-04-22');
  await page.click('[data-calculate]');
  const days  = await page.locator('[data-line-total-days]').textContent();
  const weeks = await page.locator('[data-line-total-weeks]').textContent();
  const d = parseInt(days.replace(/[^0-9]/g, ''), 10);
  const w = parseInt(weeks.replace(/[^0-9]/g, ''), 10);
  expect(w).toBe(Math.floor(d / 7));
});

test('dataLayer receives calculator_interaction event', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => { window.dataLayer = []; });
  await page.fill('[data-dob]', '1990-01-01');
  await page.fill('[data-today]', '2026-04-22');
  await page.click('[data-calculate]');
  const events = await page.evaluate(() => window.dataLayer.map(e => e.event));
  expect(events).toContain('calculator_interaction');
  expect(events).toContain('calculator_result');
});

test('prove-it workings are populated after calculate', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-dob]', '1990-06-20');
  await page.fill('[data-today]', '2026-04-22');
  await page.click('[data-calculate]');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Total months');
  expect(body).toContain('1990-06-20');
});

test('fun hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/fun/');
  await expect(page.locator('.category-grid a[href="/calculators/fun/age-in-months-calculator/"]')).toBeVisible();
});

test('primary nav includes Fun link', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-menu-toggle]');
  // Categories sit alphabetically in the submenu; assert the Fun link exists
  // rather than pinning a specific index, since new categories shift positions.
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/fun/"]')).toBeVisible();
});
