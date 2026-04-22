'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/business/break-even-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Break-Even Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Business > Break-Even Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Business');
  await expect(crumbs.nth(3)).toContainText('Break-Even');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default inputs produce break-even result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-be-units]')).not.toHaveText('—');
  await expect(page.locator('[data-line-be-revenue]')).not.toHaveText('—');
});

test('£10k fixed, £5 var cost, £15 price → 1000 units', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-fixed-costs]', '10000');
  await page.fill('[data-var-cost]', '5');
  await page.fill('[data-price]', '15');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-be-units]')).toContainText('1,000');
  await expect(page.locator('[data-line-be-revenue]')).toContainText('15,000.00');
});

test('contribution margin shown', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-fixed-costs]', '10000');
  await page.fill('[data-var-cost]', '5');
  await page.fill('[data-price]', '15');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-contribution]')).toContainText('10.00');
  await expect(page.locator('[data-line-contribution-pct]')).toContainText('66.67%');
});

test('target block hidden when no profit target entered', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-target-block]')).toBeHidden();
});

test('target block shown when profit target entered', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-fixed-costs]', '10000');
  await page.fill('[data-var-cost]', '5');
  await page.fill('[data-price]', '15');
  await page.fill('[data-target-profit]', '5000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-target-block]')).toBeVisible();
  await expect(page.locator('[data-line-target-units]')).toContainText('1,500');
});

test('scenario table has 5 rows', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const rows = page.locator('[data-scenarios-body] tr');
  await expect(rows).toHaveCount(5);
});

test('at 50% volume scenario shows a loss', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-fixed-costs]', '10000');
  await page.fill('[data-var-cost]', '5');
  await page.fill('[data-price]', '15');
  await page.click('[data-calculate]');
  const firstRow = page.locator('[data-scenarios-body] tr').first();
  const profitCell = firstRow.locator('td').last();
  const text = await profitCell.textContent();
  // 50% of break-even = 500 units → profit = 500×10 - 10000 = -5000
  expect(text).toContain('-');
});

test('show workings panel is populated', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  await expect(page.locator('[data-prove-it-body]')).not.toBeEmpty();
});

test('fires calculator_result event', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Break-Even Calculator');
  expect(typeof evt.break_even_units).toBe('number');
  expect(typeof evt.contribution_margin_pct).toBe('number');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Break-Even');
});

test('has FAQPage JSON-LD with at least 3 questions', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
});

test('primary nav includes Business link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/business/"]')).toBeVisible();
});

test('business hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/business/');
  await expect(page.locator('.category-grid')).toContainText('Break-Even');
});
