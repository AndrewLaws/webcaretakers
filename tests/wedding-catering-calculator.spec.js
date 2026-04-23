'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/wedding-catering-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Wedding Catering Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Wedding Catering Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Wedding Catering Calculator');
});

test('submits with default values and shows result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).not.toContainText('Enter your details');
});

test('3-course meal shows starter, main, and dessert rows', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-meal-style]', 'formal');
  await page.selectOption('[data-courses]', '3');
  await page.click('[data-calculate]');
  const html = await page.locator('[data-breakfast-list]').innerHTML();
  expect(html).toContain('Starter portions');
  expect(html).toContain('Main course portions');
  expect(html).toContain('Dessert portions');
});

test('2-course meal does not show starter row', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-meal-style]', 'formal');
  await page.selectOption('[data-courses]', '2');
  await page.click('[data-calculate]');
  const html = await page.locator('[data-breakfast-list]').innerHTML();
  expect(html).not.toContain('Starter portions');
  expect(html).toContain('Main course portions');
});

test('buffet style shows buffet portions row', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-meal-style]', 'buffet');
  await page.click('[data-calculate]');
  const html = await page.locator('[data-breakfast-list]').innerHTML();
  expect(html).toContain('Buffet portions');
});

test('courses row is hidden when buffet is selected', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-meal-style]', 'buffet');
  await expect(page.locator('[data-courses-row]')).toBeHidden();
});

test('canapés row is hidden when checkbox is unchecked', async ({ page }) => {
  await page.goto(URL);
  await page.uncheck('[data-include-canapes]');
  await expect(page.locator('[data-canapes-row]')).toBeHidden();
});

test('canapes section is hidden when canapes not included', async ({ page }) => {
  await page.goto(URL);
  await page.uncheck('[data-include-canapes]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-canapes-section]')).toBeHidden();
});

test('evening guests count appears in result', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');
  await page.fill('[data-evening-guests]', '30');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).toContainText('30');
});

test('evening food portions = day + evening guests', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');
  await page.fill('[data-evening-guests]', '40');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-evening-portions]')).toContainText('120');
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
  expect(evt.calculator_name).toBe('Wedding Catering Calculator');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Wedding Catering Calculator');
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
  await expect(page.locator('.category-grid')).toContainText('Catering');
});
