'use strict';

const { test, expect } = require('@playwright/test');

const URL = '/calculators/wedding/wedding-day-timeline/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Wedding Day Timeline');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Wedding > Wedding Day Timeline Generator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Wedding');
  await expect(crumbs.nth(3)).toContainText('Wedding Day Timeline');
});

test('ceremony time input defaults to 14:00', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-ceremony-time]')).toHaveValue('14:00');
});

test('reception end time input defaults to 23:30', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-reception-end-time]')).toHaveValue('23:30');
});

test('submits with default values and shows result', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-result]')).not.toContainText('Enter your ceremony');
});

test('timeline list is populated after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const items = page.locator('[data-timeline-list] .timeline-item');
  expect(await items.count()).toBeGreaterThanOrEqual(10);
});

test('ceremony start milestone shows 14:00', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-ceremony-time]', '14:00');
  await page.fill('[data-reception-end-time]', '23:30');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-timeline-list]')).toContainText('14:00');
});

test('bridal prep shows 10:00 when ceremony is 14:00', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-ceremony-time]', '14:00');
  await page.fill('[data-reception-end-time]', '23:30');
  await page.click('[data-calculate]');
  // bridal-prep is 240 min before ceremony: 14:00 - 4h = 10:00
  await expect(page.locator('[data-timeline-list]')).toContainText('10:00');
});

test('carriages shows reception end time', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-ceremony-time]', '14:00');
  await page.fill('[data-reception-end-time]', '23:30');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-timeline-list]')).toContainText('23:30');
});

test('first dance is 90 minutes before reception end', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-ceremony-time]', '14:00');
  await page.fill('[data-reception-end-time]', '23:30');
  await page.click('[data-calculate]');
  // first dance = 23:30 - 90 min = 22:00
  await expect(page.locator('[data-timeline-list]')).toContainText('22:00');
});

test('timeline is in chronological order', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const times = await page.locator('[data-timeline-list] .timeline-item .timeline-item__time').allInnerTexts();
  const minutes = times.map(t => {
    const parts = t.trim().split(':');
    if (parts.length !== 2) return null;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }).filter(m => m !== null);
  // Each time should be >= previous (allowing for wrap at midnight)
  let prev = -1;
  let wrappedOk = true;
  for (const m of minutes) {
    if (m < prev && m > 60) { wrappedOk = false; }
    prev = m;
  }
  expect(wrappedOk).toBe(true);
  expect(minutes.length).toBeGreaterThanOrEqual(10);
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
  expect(evt.calculator_name).toBe('Wedding Day Timeline Generator');
});

test('has valid SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Wedding Day Timeline');
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
  await expect(page.locator('.category-grid')).toContainText('Timeline');
});
