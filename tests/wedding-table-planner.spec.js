'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/wedding-table-planner/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Wedding Table Planner');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Wedding Table Planner Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Wedding Table Planner');
});

test('submits with default values and shows result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).not.toContainText('Enter your details');
});

test('80 guests at table of 8 shows 10 tables', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');
  await page.selectOption('[data-table-size]', '8');
  await page.fill('[data-top-table-guests]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tables]')).toContainText('10');
  await expect(page.locator('[data-line-empty]')).toContainText('None');
});

test('83 guests at table of 8 shows 11 tables and 5 empty seats', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '83');
  await page.selectOption('[data-table-size]', '8');
  await page.fill('[data-top-table-guests]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tables]')).toContainText('11');
  await expect(page.locator('[data-line-empty]')).toContainText('5');
});

test('top table guests are excluded from round table count', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');
  await page.selectOption('[data-table-size]', '8');
  await page.fill('[data-top-table-guests]', '8');
  await page.click('[data-calculate]');
  // 72 guests ÷ 8 = 9 tables
  await expect(page.locator('[data-line-tables]')).toContainText('9');
});

test('alternatives table is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const rows = page.locator('[data-alternatives-body] tr');
  expect(await rows.count()).toBeGreaterThan(0);
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
  expect(evt.calculator_name).toBe('Wedding Table Planner Calculator');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Wedding Table Planner');
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
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/wedding/"]')).toBeVisible();
});

test('wedding hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/wedding/');
  await expect(page.locator('.category-grid')).toContainText('Table Planner');
});
