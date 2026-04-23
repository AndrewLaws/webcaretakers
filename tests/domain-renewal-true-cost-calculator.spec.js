'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/business/domain-renewal-true-cost-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Domain Renewal True Cost Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs to Business', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs.first()).toContainText('Home');
  await expect(crumbs.nth(2)).toContainText('Business');
  await expect(crumbs.last()).toContainText('Domain Renewal True Cost');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default: £1 first year, £20 renewal, 5 years -> £81 total', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  // 1 + 4*20 = 81
  await expect(page.locator('[data-line-total]')).toContainText('£81.00');
  await expect(page.locator('[data-line-total-domain]')).toContainText('£81.00');
});

test('year table populates with 5 rows by default', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const rows = page.locator('[data-year-table] tbody tr');
  await expect(rows).toHaveCount(5);
});

test('alternative registrar shows savings when supplied', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-alt-annual]', '8');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-alt-section]')).toBeVisible();
  // alt total = (8+0)*5 = 40; savings = 81 - 40 = 41
  await expect(page.locator('[data-line-alt-total]')).toContainText('£40.00');
  await expect(page.locator('[data-line-savings]')).toContainText('£41.00');
});

test('alternative section hidden when alt price blank', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-alt-section]')).toBeHidden();
});

test('email add-on feeds into total', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-email-per]', '6');
  await page.fill('[data-mailboxes]', '2');
  await page.fill('[data-years]', '1');
  await page.click('[data-calculate]');
  // email 6*12*2 = 144 + domain year1 £1 = £145
  await expect(page.locator('[data-line-total]')).toContainText('£145.00');
});

test('currency toggle updates labels and output currency', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[value="USD"]');
  const labels = page.locator('[data-currency-label]');
  await expect(labels.first()).toContainText('$');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total]')).toContainText('$');
});

test('show workings is populated', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Year 1 domain');
  expect(body).toContain('Grand total');
});

test('fires calculator_result event', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Domain Renewal True Cost Calculator');
  expect(typeof evt.total_cost).toBe('number');
  expect(evt.years).toBe(5);
});

test('shows error on invalid inputs', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-years]', '0');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Domain Renewal');
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
  await expect(page.locator('.category-grid')).toContainText('Domain Renewal True Cost');
});
