'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/finance/debt-payoff-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Debt Payoff Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Finance > Debt Payoff Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Finance');
  await expect(crumbs.nth(3)).toContainText('Debt Payoff');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default inputs: £5000 at 18%, £150/month → 3 years 11 months', async ({ page }) => {
  // n = -ln(1 - 0.015×5000/150) / ln(1.015) = -ln(0.5) / ln(1.015) ≈ 46.6 → 47 months = 3 yr 11 mo
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-months]')).toContainText('3 years 11 months');
});

test('first month interest: £5000 at 18% → £75.00', async ({ page }) => {
  // monthly rate = 1.5%, interest = 5000 × 0.015 = 75
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-first-interest]')).toContainText('75.00');
});

test('first month principal: £150 payment − £75 interest = £75.00', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-first-principal]')).toContainText('75.00');
});

test('total interest and total paid shown', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-interest]')).not.toHaveText('—');
  await expect(page.locator('[data-line-total]')).not.toHaveText('—');
});

test('extra payment block hidden when no extra amount', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-extra-block]')).toBeHidden();
});

test('extra payment block visible when extra amount entered', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-extra-payment]', '50');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-extra-block]')).toBeVisible();
});

test('extra payment saves months and interest', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-extra-payment]', '50');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-months-saved]')).not.toHaveText('—');
  await expect(page.locator('[data-line-interest-saved]')).not.toHaveText('—');
});

test('shows error when payment does not cover interest', async ({ page }) => {
  // £10k at 24% APR = £200/month interest; paying £100 never reduces balance
  await page.goto(URL);
  await page.fill('[data-balance]', '10000');
  await page.fill('[data-apr]', '24');
  await page.fill('[data-monthly-payment]', '100');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-error]')).toBeVisible();
  await expect(page.locator('[data-error]')).toContainText('interest');
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
  expect(evt.calculator_name).toBe('Debt Payoff Calculator');
  expect(typeof evt.months).toBe('number');
  expect(typeof evt.total_interest).toBe('number');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Debt Payoff');
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

test('primary nav includes Finance link', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/finance/"]')).toBeVisible();
});

test('finance hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/finance/');
  await expect(page.locator('.category-grid')).toContainText('Debt Payoff');
});
