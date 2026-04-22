'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/finance/uk-stamp-duty-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('UK Stamp Duty Calculator 2025/26');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Finance > UK Stamp Duty Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Finance');
  await expect(crumbs.nth(3)).toContainText('UK Stamp Duty');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default £350k standard purchase → £7,500 stamp duty', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-total]')).toContainText('7,500.00');
});

test('effective rate shown after calculation', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-eff-rate]')).not.toHaveText('—');
});

test('selecting first-time buyer shows FTB notice', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="first_time_buyer"]');
  await expect(page.locator('[data-ftb-notice]')).toBeVisible();
});

test('first-time buyer £300k → £0 stamp duty', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="first_time_buyer"]');
  await page.fill('[data-purchase-price]', '300000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total]')).toContainText('0.00');
});

test('first-time buyer £400k → £5,000 stamp duty', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="first_time_buyer"]');
  await page.fill('[data-purchase-price]', '400000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total]')).toContainText('5,000.00');
});

test('first-time buyer above £500k → ineligible notice shown', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="first_time_buyer"]');
  await page.fill('[data-purchase-price]', '600000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-ftb-ineligible-notice]')).toBeVisible();
});

test('additional property £300k → £20,000 stamp duty', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="additional"]');
  await page.fill('[data-purchase-price]', '300000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total]')).toContainText('20,000.00');
});

test('band breakdown table rendered with rows', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const rows = page.locator('[data-bands-body] tr');
  await expect(rows).toHaveCount(3); // three bands for £350k standard
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
  expect(evt.calculator_name).toBe('UK Stamp Duty Calculator');
  expect(typeof evt.total_tax).toBe('number');
  expect(typeof evt.effective_rate).toBe('number');
});

test('has SoftwareApplication JSON-LD with countriesSupported GB', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Stamp Duty');
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

test('primary nav includes Finance link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/finance/"]')).toBeVisible();
});

test('finance hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/finance/');
  await expect(page.locator('.category-grid')).toContainText('Stamp Duty');
});
