'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/business/it-support-build-vs-buy-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('IT Support Build vs Buy Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Business > IT Support Build vs Buy Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs.first()).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Business');
  await expect(crumbs.last()).toContainText('IT Support Build vs Buy');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default scenario: managed cheaper at 25 users', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-verdict]')).toContainText(/Managed service is cheaper/i);
  await expect(page.locator('[data-line-inhouse-annual]')).toContainText('£62,250.00');
  await expect(page.locator('[data-line-managed-annual]')).toContainText('£23,000.00');
});

test('in-house wins at high headcount', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-employees]', '150');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-verdict]')).toContainText(/In-house is cheaper/i);
});

test('break-even users shown', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-breakeven]')).toContainText('users');
});

test('currency toggle updates labels and money format', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="USD"]');
  const labels = page.locator('[data-currency-label]');
  await expect(labels.first()).toContainText('$');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-inhouse-annual]')).toContainText('$');
});

test('show workings panel is populated', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Loaded salary');
  expect(body).toContain('Managed annual');
  expect(body).toContain('Break-even users');
});

test('fires calculator_result event with totals and verdict', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('IT Support Build vs Buy Calculator');
  expect(typeof evt.in_house_annual).toBe('number');
  expect(typeof evt.managed_annual).toBe('number');
  expect(evt.verdict).toBe('managed');
});

test('shows error when employees is zero', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-employees]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('IT Support');
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
  await expect(page.locator('.category-grid')).toContainText('IT Support Build vs Buy');
});
