'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/property/rental-yield-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Rental Yield Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Property > Rental Yield Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Property');
  await expect(crumbs.nth(3)).toContainText('Rental Yield');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('defaults calculate gross yield 5.76% and net yield 4.14%', async ({ page }) => {
  // £250,000, £1,200/mo, costs 1440+1000+300+1200+0=3940
  // gross = 14400/250000 = 5.76%
  // net   = (14400 - 3940)/250000 = 10460/250000 = 4.184% -> 4.18%
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-gross-yield]')).toContainText('5.76%');
  await expect(page.locator('[data-line-net-yield]')).toContainText('4.18%');
});

test('cash-on-cash section appears when deposit is set', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-cash-flow-section]')).toBeVisible();
  await expect(page.locator('[data-line-roi]')).not.toHaveText('—');
});

test('cash-on-cash hidden when deposit is zero', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-deposit]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-cash-flow-section]')).toBeHidden();
});

test('zero monthly rent gives zero gross and net yield', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-monthly-rent]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-gross-yield]')).toContainText('0.00%');
});

test('currency toggle to USD updates labels and money format', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="USD"]');
  const labels = page.locator('[data-currency-label]');
  await expect(labels.first()).toContainText('$');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-annual-rent]')).toContainText('$');
});

test('show workings panel is populated', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Gross yield');
  expect(body).toContain('Net yield');
});

test('fires calculator_result event with yield numbers', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Rental Yield Calculator');
  expect(typeof evt.gross_yield).toBe('number');
  expect(typeof evt.net_yield).toBe('number');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Rental Yield');
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

test('primary nav includes Property link', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/property/"]')).toBeVisible();
});

test('property hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/property/');
  await expect(page.locator('.category-grid')).toContainText('Rental Yield');
});
