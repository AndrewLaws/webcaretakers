'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/broadband/web-hosting-estimator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Web Hosting Storage');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Broadband > Web Hosting Estimator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Broadband');
  await expect(crumbs.nth(3)).toContainText('Web Hosting Estimator');
});

test('submits with defaults and shows shared tier result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const result = page.locator('[data-result]');
  await expect(result).toContainText('Shared hosting');
});

test('bandwidth line is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const bw = page.locator('[data-line-buffered-bw]');
  await expect(bw).not.toHaveText('—');
  await expect(bw).toContainText('GB');
});

test('storage line is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const storage = page.locator('[data-line-buffered-storage]');
  await expect(storage).not.toHaveText('—');
});

test('tier line shows Shared hosting for default inputs', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tier]')).toContainText('Shared hosting');
});

test('shows VPS tier for high traffic inputs', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-monthly-visitors]', '50000');
  await page.fill('[data-pages-per-visit]', '3');
  await page.fill('[data-page-weight-kb]', '3000');
  await page.fill('[data-buffer-percent]', '50');
  await page.click('[data-calculate]');
  const tierLine = page.locator('[data-line-tier]');
  await expect(tierLine).toContainText(/VPS|dedicated/i);
});

test('shows dedicated tier for very high traffic', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-monthly-visitors]', '500000');
  await page.fill('[data-pages-per-visit]', '3');
  await page.fill('[data-page-weight-kb]', '3000');
  await page.fill('[data-buffer-percent]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tier]')).toContainText('Dedicated');
});

test('buffer label updates in results header', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-buffer-percent]', '40');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-label-buffer]')).toHaveText('40');
});

test('prove-it section is visible and contains workings', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.click('.prove-it summary');
  await expect(page.locator('[data-prove-it-body]')).not.toBeEmpty();
});

test('prove-it body contains bandwidth calculation', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.click('.prove-it summary');
  await expect(page.locator('[data-prove-it-body]')).toContainText('bandwidth');
});

test('fires calculator_result dataLayer event on submit', async ({ page }) => {
  const events = [];
  await page.goto(URL);
  await page.evaluate(() => {
    window.dataLayer = window.dataLayer || [];
    window._origPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents = window._dlEvents || []; window._dlEvents.push(obj); return window._origPush(obj); };
  });
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const resultEvent = dlEvents.find(e => e.event === 'calculator_result');
  expect(resultEvent).toBeTruthy();
  expect(resultEvent.calculator_name).toBe('Web Hosting Estimator');
  expect(resultEvent.result_tier).toBe('shared');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent));
  });
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Web Hosting');
});

test('has FAQPage JSON-LD with at least 3 questions', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent));
  });
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
});

test('primary nav includes Broadband link', async ({ page }) => {
  await page.goto(URL);
  const navItems = page.locator('.primary-nav__submenu a');
  await expect(navItems.filter({ hasText: 'Broadband' })).toBeVisible();
});

test('broadband hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/broadband/');
  await expect(page.locator('.category-grid')).toContainText('Web Hosting');
});
