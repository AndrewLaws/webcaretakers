'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/finance/uk-salary-tax-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('UK Salary Tax Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Finance > UK Salary Tax Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Finance');
  await expect(crumbs.nth(3)).toContainText('Salary Tax');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('calculates take-home for £30,000 salary', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '30000');
  await page.selectOption('[data-student-loan]', 'none');
  await page.click('[data-calculate]');
  // take-home = £25,119.60
  await expect(page.locator('[data-line-annual]')).toContainText('25,119.60');
});

test('income tax shown for £30,000', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '30000');
  await page.click('[data-calculate]');
  // income tax = £3,486.00
  await expect(page.locator('[data-line-tax]')).toContainText('3,486.00');
});

test('NI shown for £30,000', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '30000');
  await page.click('[data-calculate]');
  // NI = £1,394.40
  await expect(page.locator('[data-line-ni]')).toContainText('1,394.40');
});

test('monthly take-home is shown', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '30000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-monthly]')).toContainText('2,093.30');
});

test('student loan Plan 2 reduces take-home', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '40000');
  await page.selectOption('[data-student-loan]', 'plan2');
  await page.click('[data-calculate]');
  // With no loan: take-home should be higher
  const withLoan = await page.locator('[data-line-annual]').innerText();
  await page.selectOption('[data-student-loan]', 'none');
  await page.click('[data-calculate]');
  const noLoan = await page.locator('[data-line-annual]').innerText();
  // withLoan should be less than noLoan
  const parseGBP = s => parseFloat(s.replace(/[£,]/g, ''));
  expect(parseGBP(withLoan)).toBeLessThan(parseGBP(noLoan));
});

test('higher rate shown for £60,000 salary', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '60000');
  await page.click('[data-calculate]');
  // higher rate tax = £3,892 on £9,730
  await expect(page.locator('[data-line-higher]')).toContainText('3,892.00');
});

test('effective tax rate is shown', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '30000');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-eff-tax]')).toContainText('%');
});

test('breakdown is visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-gross-salary]', '35000');
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
  await page.fill('[data-gross-salary]', '35000');
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('UK Salary Tax Calculator');
});

test('has SoftwareApplication JSON-LD with GB country', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.countriesSupported).toBe('GB');
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
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/finance/"]')).toBeVisible();
});

test('finance hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/finance/');
  await expect(page.locator('.category-grid')).toContainText('Salary');
});
