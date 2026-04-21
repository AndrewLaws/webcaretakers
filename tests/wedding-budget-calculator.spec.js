'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/wedding-budget-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Wedding Budget Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Wedding Budget Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Wedding Budget Calculator');
});

test('submits with default values and shows result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).not.toContainText('Enter your budget');
});

test('shows 9 category rows after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const items = page.locator('[data-category-list] li');
  await expect(items).toHaveCount(9);
});

test('venue amount is correct for £20,000 budget', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-total-budget]', '20000');
  await page.fill('[data-guest-count]', '80');
  await page.click('[data-calculate]');
  // Venue is 30% of £20,000 = £6,000
  await expect(page.locator('[data-category-list]')).toContainText('6,000');
});

test('per-head line is shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-total-budget]', '10000');
  await page.fill('[data-guest-count]', '100');
  await page.click('[data-calculate]');
  // £10,000 ÷ 100 guests = £100 per head
  await expect(page.locator('[data-line-per-head]')).toContainText('100');
});

test('currency toggle changes symbol in label', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-currency]', 'USD');
  await expect(page.locator('[data-currency-symbol]')).toContainText('$');
});

test('currency toggle changes symbol in results', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-currency]', 'EUR');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-category-list]')).toContainText('€');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('breakdown is visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
});

test('prove-it section is present', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-prove-it]')).toBeVisible();
});

test('fires calculator_result dataLayer event on submit', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.dataLayer = window.dataLayer || [];
    window._dlEvents = [];
    var origPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return origPush(obj); };
  });
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Wedding Budget Calculator');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Wedding Budget Calculator');
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

test('primary nav includes Wedding link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/wedding/"]')).toBeVisible();
});

test('wedding hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/wedding/');
  await expect(page.locator('.category-grid')).toContainText('Wedding Budget');
});
