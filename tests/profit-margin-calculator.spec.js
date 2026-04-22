'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/business/profit-margin-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Profit Margin Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Business > Profit Margin Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Business');
  await expect(crumbs.nth(3)).toContainText('Profit Margin');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('margin mode: default inputs produce gross margin result', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="margin"]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-gross-margin]')).not.toHaveText('—');
  await expect(page.locator('[data-line-gross-profit]')).not.toHaveText('—');
  await expect(page.locator('[data-line-markup]')).not.toHaveText('—');
});

test('margin mode: £10k revenue, £6k cogs → 40% gross margin', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="margin"]');
  await page.fill('[data-revenue]', '10000');
  await page.fill('[data-cogs]', '6000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-gross-margin]')).toContainText('40.00%');
  await expect(page.locator('[data-line-gross-profit]')).toContainText('4,000.00');
});

test('margin mode: net block shown when opex entered', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="margin"]');
  await page.fill('[data-revenue]', '10000');
  await page.fill('[data-cogs]', '6000');
  await page.fill('[data-opex]', '2000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-net-block]')).toBeVisible();
  await expect(page.locator('[data-line-net-margin]')).toContainText('20.00%');
  await expect(page.locator('[data-line-net-profit]')).toContainText('2,000.00');
});

test('margin mode: net block hidden when no opex', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="margin"]');
  await page.fill('[data-revenue]', '10000');
  await page.fill('[data-cogs]', '6000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-net-block]')).toBeHidden();
});

test('price from margin mode: £60 cost, 40% target → £100 price', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="price_from_margin"]');
  await page.fill('[data-cost-margin]', '60');
  await page.fill('[data-target-margin]', '40');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-pfm-price]')).toContainText('100.00');
  await expect(page.locator('[data-line-pfm-profit]')).toContainText('40.00');
});

test('price from markup mode: £80 cost, 25% markup → £100 price', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="price_from_markup"]');
  await page.fill('[data-cost-markup]', '80');
  await page.fill('[data-target-markup]', '25');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-pfu-price]')).toContainText('100.00');
  await expect(page.locator('[data-line-pfu-margin]')).toContainText('20.00%');
});

test('show workings panel contains formula', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="margin"]');
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  await expect(page.locator('[data-prove-it-body]')).not.toBeEmpty();
});

test('fires calculator_result event', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="margin"]');
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Profit Margin Calculator');
  expect(typeof evt.gross_margin_pct).toBe('number');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Profit Margin');
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
  await expect(page.locator('.category-grid')).toContainText('Profit Margin');
});
