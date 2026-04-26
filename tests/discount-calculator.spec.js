'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/math/discount-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Discount Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs route through Calculators > Math', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Math');
  await expect(crumbs.nth(3)).toContainText('Discount');
});

test('does not use data-calculator attribute (avoids generic GTM binding)', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-calculator]')).toHaveCount(0);
});

test('uses class calculator-card', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.calculator-card')).toBeVisible();
});

// MODE 1: single discount
test('single discount: 100 with 25% off => sale 75, saved 25', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'single');
  await page.selectOption('[data-single-sub]', 'price-percent');
  await page.fill('[data-original]', '100');
  await page.fill('[data-percent]', '25');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-sale]')).toContainText('75');
  await expect(page.locator('[data-line-saved]')).toContainText('25');
});

test('single discount reverse: original 80, sale 60 => 25% off', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'single');
  await page.selectOption('[data-single-sub]', 'price-sale');
  await page.fill('[data-original]', '80');
  await page.fill('[data-sale]', '60');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-percent]')).toContainText('25');
  await expect(page.locator('[data-line-saved]')).toContainText('20');
});

test('single discount from amount saved: original 200, saved 50 => 25% off', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'single');
  await page.selectOption('[data-single-sub]', 'price-saved');
  await page.fill('[data-original]', '200');
  await page.fill('[data-saved]', '50');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-percent]')).toContainText('25');
  await expect(page.locator('[data-line-sale]')).toContainText('150');
});

// MODE 2: stacked discounts
test('stacked discounts: 30% then 20% on 100 => 56 (effective 44%)', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'stacked');
  await page.fill('[data-stacked-original]', '100');
  await page.fill('[data-stacked-1]', '30');
  await page.fill('[data-stacked-2]', '20');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-stacked-final]')).toContainText('56');
  await expect(page.locator('[data-line-stacked-effective]')).toContainText('44');
});

test('stacked discounts: 50% then 50% on 100 => 25 (effective 75%)', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'stacked');
  await page.fill('[data-stacked-original]', '100');
  await page.fill('[data-stacked-1]', '50');
  await page.fill('[data-stacked-2]', '50');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-stacked-final]')).toContainText('25');
  await expect(page.locator('[data-line-stacked-effective]')).toContainText('75');
});

// MODE 3: tax
test('tax exclusive: 100 + 20% tax => 120 final', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'tax');
  await page.selectOption('[data-tax-mode]', 'exclusive');
  await page.fill('[data-tax-price]', '100');
  await page.fill('[data-tax-rate]', '20');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tax-final]')).toContainText('120');
  await expect(page.locator('[data-line-tax-amount]')).toContainText('20');
});

test('tax inclusive: 120 incl 20% tax => 100 net', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'tax');
  await page.selectOption('[data-tax-mode]', 'inclusive');
  await page.fill('[data-tax-price]', '120');
  await page.fill('[data-tax-rate]', '20');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tax-net]')).toContainText('100');
  await expect(page.locator('[data-line-tax-amount]')).toContainText('20');
});

// MODE 4: BOGOF
test('BOGOF: buy 2 get 1 free at 10 each => effective 6.67 per unit', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'bogof');
  await page.fill('[data-bogof-buy]', '2');
  await page.fill('[data-bogof-free]', '1');
  await page.fill('[data-bogof-price]', '10');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bogof-effective]')).toContainText('6.67');
  await expect(page.locator('[data-line-bogof-saved]')).toContainText('10');
});

test('BOGOF: buy 1 get 1 free at 20 => effective 10 per unit (50% off)', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'bogof');
  await page.fill('[data-bogof-buy]', '1');
  await page.fill('[data-bogof-free]', '1');
  await page.fill('[data-bogof-price]', '20');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bogof-effective]')).toContainText('10');
  await expect(page.locator('[data-line-bogof-discount]')).toContainText('50');
});

// Mode switching
test('switching mode shows the right panel', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-mode]', 'stacked');
  await expect(page.locator('[data-panel-stacked]')).toBeVisible();
  await expect(page.locator('[data-panel-single]')).toBeHidden();
  await page.selectOption('[data-mode]', 'tax');
  await expect(page.locator('[data-panel-tax]')).toBeVisible();
  await page.selectOption('[data-mode]', 'bogof');
  await expect(page.locator('[data-panel-bogof]')).toBeVisible();
});

// Reference table
test('has quick-glance reference table', async ({ page }) => {
  await page.goto(URL);
  const table = page.locator('table.discount-reference');
  await expect(table).toBeVisible();
  await expect(table).toContainText('10');
  await expect(table).toContainText('25');
  await expect(table).toContainText('50');
  await expect(table).toContainText('75');
});

// Schema
test('has SoftwareApplication JSON-LD with en-GB', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Discount');
  expect(app.applicationCategory).toBe('BusinessApplication');
  expect(app.inLanguage).toBe('en-GB');
  expect(app.offers).toBeTruthy();
  expect(app.offers.price).toBe('0');
});

test('has FAQPage JSON-LD with at least 4 questions', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
});

// dataLayer events
test('fires calculator_result dataLayer event with correct name', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window._dlEvents = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return orig(obj); };
  });
  await page.fill('[data-original]', '100');
  await page.fill('[data-percent]', '25');
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Discount Calculator');
});

test('fires calculator_interaction dataLayer event', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window._dlEvents = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return orig(obj); };
  });
  await page.fill('[data-original]', '50');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_interaction');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Discount Calculator');
});

// Tone
test('no em dashes in body copy', async ({ page }) => {
  await page.goto(URL);
  const text = await page.locator('main').innerText();
  expect(text.includes('\u2014')).toBe(false);
});

test('no use of the word automated in body copy', async ({ page }) => {
  await page.goto(URL);
  const text = (await page.locator('main').innerText()).toLowerCase();
  expect(text.includes('automated')).toBe(false);
});

// Related calculators
test('related calculators links to Percentage, UK VAT, Tip, Profit Margin', async ({ page }) => {
  await page.goto(URL);
  const related = page.locator('.related-calculators');
  await expect(related).toContainText('Percentage');
  await expect(related).toContainText('VAT');
  await expect(related).toContainText('Tip');
  await expect(related).toContainText('Profit Margin');
});

// Math hub lists it
test('math hub lists Discount Calculator', async ({ page }) => {
  await page.goto('/calculators/math/');
  await expect(page.locator('.category-grid')).toContainText('Discount');
});
