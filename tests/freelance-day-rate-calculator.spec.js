'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/business/freelance-day-rate-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Freelance Day Rate Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Business > Freelance Day Rate Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Business');
  await expect(crumbs.nth(3)).toContainText('Day Rate');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default inputs produce a day rate', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-day-rate]')).not.toHaveText('—');
  await expect(page.locator('[data-line-hourly]')).not.toHaveText('—');
});

test('day rate contains £ symbol', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const dayRate = await page.locator('[data-line-day-rate]').textContent();
  expect(dayRate).toContain('£');
});

test('all rate lines visible after calculate', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-day-rate]')).toBeVisible();
  await expect(page.locator('[data-line-half-day]')).toBeVisible();
  await expect(page.locator('[data-line-hourly]')).toBeVisible();
  await expect(page.locator('[data-line-weekly]')).toBeVisible();
  await expect(page.locator('[data-line-monthly]')).toBeVisible();
});

test('higher income target produces higher day rate', async ({ page }) => {
  await page.goto(URL);

  await page.fill('[data-income-target]', '50000');
  await page.click('[data-calculate]');
  const low = await page.locator('[data-line-day-rate]').textContent();

  await page.fill('[data-income-target]', '100000');
  await page.click('[data-calculate]');
  const high = await page.locator('[data-line-day-rate]').textContent();

  const parse = s => parseFloat(s.replace(/[^0-9.]/g, ''));
  expect(parse(high)).toBeGreaterThan(parse(low));
});

test('billable days shown in results', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-working-days]', '260');
  await page.fill('[data-non-billable]', '40');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-billable-days]')).toContainText('220');
});

test('show workings panel is populated', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  await expect(page.locator('[data-prove-it-body]')).not.toBeEmpty();
});

test('fires calculator_result event', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Freelance Day Rate Calculator');
  expect(typeof evt.day_rate).toBe('number');
  expect(typeof evt.annual_income_target).toBe('number');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Freelance Day Rate');
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
  await expect(page.locator('.category-grid')).toContainText('Freelance Day Rate');
});
