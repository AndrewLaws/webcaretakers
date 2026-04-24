'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/health/pregnancy-due-date-calculator/';

// Helper: format a Date as YYYY-MM-DD
function iso(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Pregnancy Due Date Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs: Home > Calculators > Health > Pregnancy Due Date', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Health');
  await expect(crumbs.nth(3)).toContainText('Pregnancy');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('LMP calculates due date as LMP + 280 days', async ({ page }) => {
  await page.goto(URL);
  // LMP 2026-01-01 -> due 2026-10-08
  await page.check('input[value="lmp"]');
  await page.fill('[data-date]', '2026-01-01');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-due]')).toContainText('8 October 2026');
});

test('conception date calculates due date as conception + 266 days', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="conception"]');
  await page.fill('[data-date]', '2026-01-15');
  await page.click('[data-calculate]');
  // 2026-01-15 + 266 days = 2026-10-08
  await expect(page.locator('[data-line-due]')).toContainText('8 October 2026');
});

test('IVF 5-day transfer calculates due date as transfer + 261 days', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="ivf"]');
  await page.check('input[value="5"]');
  await page.fill('[data-date]', '2026-01-20');
  await page.click('[data-calculate]');
  // 2026-01-20 + 261 days = 2026-10-08
  await expect(page.locator('[data-line-due]')).toContainText('8 October 2026');
});

test('IVF 3-day transfer calculates due date as transfer + 263 days', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="ivf"]');
  await page.check('input[value="3"]');
  await page.fill('[data-date]', '2026-01-18');
  await page.click('[data-calculate]');
  // 2026-01-18 + 263 days = 2026-10-08
  await expect(page.locator('[data-line-due]')).toContainText('8 October 2026');
});

test('shows milestone dates (first trimester, viability, full term)', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="lmp"]');
  await page.fill('[data-date]', '2026-01-01');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-t1]')).toContainText('2026');
  await expect(page.locator('[data-line-viability]')).toContainText('2026');
  await expect(page.locator('[data-line-fullterm]')).toContainText('2026');
});

test('shows gestational age when LMP is within pregnancy window', async ({ page }) => {
  await page.goto(URL);
  // Use an LMP roughly 10 weeks before today
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 70);
  await page.check('input[value="lmp"]');
  await page.fill('[data-date]', iso(d));
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-gestational]')).toContainText('weeks');
});

test('breakdown visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="lmp"]');
  await page.fill('[data-date]', '2026-01-01');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
});

test('fires calculator_result dataLayer event', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window._dlEvents = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return orig(obj); };
  });
  await page.check('input[value="lmp"]');
  await page.fill('[data-date]', '2026-01-01');
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Pregnancy Due Date Calculator');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Pregnancy');
  expect(app.applicationCategory).toBe('HealthApplication');
});

test('has FAQPage JSON-LD with at least 4 questions', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
});

test('health hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/health/');
  await expect(page.locator('.category-grid')).toContainText('Pregnancy');
});

test('primary nav includes Health link', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/health/"]')).toBeVisible();
});

test('no em dashes in body copy', async ({ page }) => {
  await page.goto(URL);
  const text = await page.locator('main').innerText();
  expect(text.includes('\u2014')).toBe(false);
});

test('IVF embryo day toggle hidden when method is LMP', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="lmp"]');
  await expect(page.locator('[data-ivf-toggle]')).toBeHidden();
});

test('IVF embryo day toggle visible when method is IVF', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="ivf"]');
  await expect(page.locator('[data-ivf-toggle]')).toBeVisible();
});
