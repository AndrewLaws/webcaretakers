'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/business/uk-vat-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('UK VAT Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Business > UK VAT Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Business');
  await expect(crumbs.nth(3)).toContainText('UK VAT Calculator');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('adds 20% VAT: £100 net → £120 gross', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-amount]', '100');
  await page.check('input[value="20"]');
  await page.check('input[value="add"]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-gross]')).toContainText('120.00');
  await expect(page.locator('[data-line-vat]')).toContainText('20.00');
  await expect(page.locator('[data-line-net]')).toContainText('100.00');
});

test('removes 20% VAT: £120 gross → £100 net', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-amount]', '120');
  await page.check('input[value="20"]');
  await page.check('input[value="remove"]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-net]')).toContainText('100.00');
  await expect(page.locator('[data-line-vat]')).toContainText('20.00');
});

test('adds 5% reduced rate', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-amount]', '200');
  await page.check('input[value="5"]');
  await page.check('input[value="add"]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-gross]')).toContainText('210.00');
  await expect(page.locator('[data-line-vat]')).toContainText('10.00');
});

test('zero rate shows no VAT', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-amount]', '100');
  await page.check('input[value="0"]');
  await page.check('input[value="add"]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-vat]')).toContainText('0.00');
  await expect(page.locator('[data-line-gross]')).toContainText('100.00');
});

test('breakdown is visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-amount]', '100');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
});

test('rate name is shown', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-amount]', '100');
  await page.check('input[value="20"]');
  await page.check('input[value="add"]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-rate]')).toContainText('Standard');
});

test('fires calculator_result dataLayer event', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window._dlEvents = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return orig(obj); };
  });
  await page.fill('[data-amount]', '100');
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('UK VAT Calculator');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('VAT');
  expect(app.countriesSupported).toBe('GB');
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
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/business/"]')).toBeVisible();
});

test('business hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/business/');
  await expect(page.locator('.category-grid')).toContainText('VAT');
});
