'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/wedding-drinks-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Wedding Drinks Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Wedding Drinks Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Wedding Drinks Calculator');
});

test('submits with default values and shows result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).not.toContainText('Enter your details');
});

test('all six quantity lines are populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  for (const attr of ['[data-line-white-wine]', '[data-line-red-wine]', '[data-line-prosecco]', '[data-line-beer]', '[data-line-spirits]', '[data-line-soft]']) {
    const text = await page.locator(attr).innerText();
    expect(parseInt(text)).toBeGreaterThan(0);
  }
});

test('summary lines are populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const perPerson = await page.locator('[data-line-per-person]').innerText();
  const total = await page.locator('[data-line-total]').innerText();
  expect(parseFloat(perPerson)).toBeGreaterThan(0);
  expect(parseInt(total)).toBeGreaterThan(0);
});

test('heavy style gives more bottles than moderate', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');

  // Moderate
  await page.selectOption('[data-drinking-style]', 'moderate');
  await page.click('[data-calculate]');
  const moderateWhite = parseInt(await page.locator('[data-line-white-wine]').innerText());

  // Heavy
  await page.selectOption('[data-drinking-style]', 'heavy');
  await page.click('[data-calculate]');
  const heavyWhite = parseInt(await page.locator('[data-line-white-wine]').innerText());

  expect(heavyWhite).toBeGreaterThan(moderateWhite);
});

test('light style gives fewer bottles than moderate', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');

  // Moderate
  await page.selectOption('[data-drinking-style]', 'moderate');
  await page.click('[data-calculate]');
  const moderateWhite = parseInt(await page.locator('[data-line-white-wine]').innerText());

  // Light
  await page.selectOption('[data-drinking-style]', 'light');
  await page.click('[data-calculate]');
  const lightWhite = parseInt(await page.locator('[data-line-white-wine]').innerText());

  expect(lightWhite).toBeLessThan(moderateWhite);
});

test('unchecking toast reduces prosecco count', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-guest-count]', '80');

  // With toast (default — checked)
  await page.click('[data-calculate]');
  const withToast = parseInt(await page.locator('[data-line-prosecco]').innerText());

  // Without toast
  await page.uncheck('[data-include-toast]');
  await page.click('[data-calculate]');
  const withoutToast = parseInt(await page.locator('[data-line-prosecco]').innerText());

  expect(withToast).toBeGreaterThan(withoutToast);
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

test('prove-it body is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  // Open the details element so innerText is accessible
  await page.click('[data-prove-it] summary');
  const body = await page.locator('[data-prove-it-body]').innerText();
  expect(body.trim().length).toBeGreaterThan(10);
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
  expect(evt.calculator_name).toBe('Wedding Drinks Calculator');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Wedding Drinks Calculator');
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
  await expect(page.locator('.category-grid')).toContainText('Drinks');
});
