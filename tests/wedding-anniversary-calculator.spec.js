'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/wedding-anniversary-calculator/';

// A fixed past date whose anniversary year and gift theme are predictable
// 2015-04-21 is 11 years before 2026-04-21 (today), traditional gift: Steel
const WEDDING_DATE = '2015-04-21';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Wedding Anniversary Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Wedding Anniversary Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Wedding Anniversary Calculator');
});

test('date input is pre-filled with a past date', async ({ page }) => {
  await page.goto(URL);
  const val = await page.inputValue('[data-wedding-date]');
  expect(val).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const d = new Date(val);
  expect(d < new Date()).toBe(true);
});

test('submits and shows anniversary result', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).not.toContainText('Enter your wedding date');
});

test('anniversary year is shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  // 2015 to 2026 = 11 years, anniversary on Apr 21 = today
  await expect(page.locator('[data-anniversary-year]')).toContainText('11');
});

test('traditional gift is shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-traditional]')).toContainText('Steel');
});

test('modern gift is shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-modern]')).toContainText('Fashion jewellery');
});

test('days until next anniversary is shown', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  const text = await page.locator('[data-days-until]').innerText();
  expect(text).toMatch(/\d+/);
});

test('milestones table is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  const rows = page.locator('[data-milestones-body] tr');
  expect(await rows.count()).toBeGreaterThan(0);
});

test('milestones include year 15 (Crystal)', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-milestones-body]')).toContainText('Crystal');
});

test('anniversary today banner shown for matching date', async ({ page }) => {
  await page.goto(URL);
  // Compute a wedding date exactly 11 years before today so isAnniversaryToday is always true
  const today = new Date();
  const elevenYearsAgo = new Date(Date.UTC(today.getFullYear() - 11, today.getMonth(), today.getDate()));
  const todayAnniversary = elevenYearsAgo.toISOString().slice(0, 10);
  await page.fill('[data-wedding-date]', todayAnniversary);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-today-banner]')).toBeVisible();
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('breakdown is visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
});

test('fires calculator_result dataLayer event on submit', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window.dataLayer = window.dataLayer || [];
    window._dlEvents = [];
    var origPush = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return origPush(obj); };
  });
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Wedding Anniversary Calculator');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Wedding Anniversary Calculator');
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
  await expect(page.locator('.category-grid')).toContainText('Anniversary');
});
