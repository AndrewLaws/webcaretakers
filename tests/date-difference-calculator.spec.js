'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/fun/date-difference-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Date Difference Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs: Home > Calculators > Fun > Date Difference Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Fun');
  await expect(crumbs.nth(3)).toContainText('Date Difference');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('error when dates missing', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
});

test('known result: 2020-01-01 to 2026-04-22', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-from]', '2020-01-01');
  await page.fill('[data-to]',   '2026-04-22');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-ymd]')).toContainText('6 years, 3 months, 21 days');
});

test('one-year span shows 365 days', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-from]', '2025-04-22');
  await page.fill('[data-to]',   '2026-04-22');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total-days]')).toContainText('365');
});

test('reversed dates show the flip note', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-from]', '2026-04-22');
  await page.fill('[data-to]',   '2020-01-01');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-reversed-note]')).toBeVisible();
  await expect(page.locator('[data-line-ymd]')).toContainText('6 years');
});

test('business days: Mon to Fri single week = 5', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-from]', '2026-04-20');
  await page.fill('[data-to]',   '2026-04-24');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-business-days]')).toContainText('5 days');
});

test('dataLayer receives events', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => { window.dataLayer = []; });
  await page.fill('[data-from]', '2026-01-01');
  await page.fill('[data-to]',   '2026-02-01');
  await page.click('[data-calculate]');
  const events = await page.evaluate(() => window.dataLayer.map(e => e.event));
  expect(events).toContain('calculator_interaction');
  expect(events).toContain('calculator_result');
});

test('prove-it workings populated', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-from]', '2026-01-01');
  await page.fill('[data-to]',   '2026-12-31');
  await page.click('[data-calculate]');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('From:');
  expect(body).toContain('Total days');
});

test('fun hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/fun/');
  await expect(page.locator('a[href="/calculators/fun/date-difference-calculator/"]')).toBeVisible();
});
