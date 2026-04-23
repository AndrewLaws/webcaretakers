'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/save-the-date-calculator/';

// A deterministic future date for all submission tests
const WEDDING_DATE = '2027-09-18';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Save the Date');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Save the Date Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Save the Date');
});

test('date input is pre-filled with a future date', async ({ page }) => {
  await page.goto(URL);
  const val = await page.inputValue('[data-wedding-date]');
  expect(val).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const d = new Date(val);
  expect(d > new Date()).toBe(true);
});

test('submits and shows timeline result with wedding date', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).toContainText('18 September 2027');
});

test('timeline list is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  const items = page.locator('.timeline-item');
  await expect(items).toHaveCount(await items.count());
  expect(await items.count()).toBeGreaterThanOrEqual(10);
});

test('save-the-date milestone appears in timeline', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('.timeline-list')).toContainText('save-the-date', { ignoreCase: true });
});

test('send invitations milestone appears in timeline', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  await expect(page.locator('.timeline-list')).toContainText('invitations', { ignoreCase: true });
});

test('rehearsal milestone is last item in timeline', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);
  await page.click('[data-calculate]');
  const items = page.locator('.timeline-item');
  const count = await items.count();
  await expect(items.nth(count - 1)).toContainText('Rehearsal');
});

test('destination checkbox changes save-the-date label in result', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-wedding-date]', WEDDING_DATE);

  // Local: save-the-date is Feb 2027 (7 months before)
  await page.click('[data-calculate]');
  const localText = await page.locator('.timeline-list').innerText();
  expect(localText).toContain('February 2027');

  // Destination: save-the-date is Nov 2026 (10 months before)
  await page.check('[data-is-destination]');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).toContainText('destination');
  const destText = await page.locator('.timeline-list').innerText();
  expect(destText).toContain('November 2026');
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
  expect(evt.calculator_name).toBe('Save the Date Calculator');
  expect(evt.wedding_date).toBe(WEDDING_DATE);
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Save the Date');
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
  await expect(page.locator('.category-grid')).toContainText('Save the Date');
});

test('wedding hub has correct h1', async ({ page }) => {
  await page.goto('/calculators/wedding/');
  await expect(page.locator('h1')).toContainText('Wedding');
});
