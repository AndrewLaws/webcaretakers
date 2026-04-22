'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/productivity/website-speed-budget-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Website Performance Budget Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Productivity > Website Performance Budget Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Productivity');
  await expect(crumbs.nth(3)).toContainText('Performance Budget');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('shows page weight budget after submit', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-site-type]', 'ecommerce');
  await page.selectOption('[data-connection-target]', 'mobile_fast');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-total]')).toContainText('KB');
  await expect(page.locator('[data-line-js]')).toContainText('KB');
  await expect(page.locator('[data-line-images]')).toContainText('KB');
});

test('CWV targets are shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-lcp]')).toContainText('s');
  await expect(page.locator('[data-line-cls]')).not.toBeEmpty();
  await expect(page.locator('[data-line-inp]')).toContainText('ms');
});

test('mobile_slow budget is smaller than desktop', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-site-type]', 'blog');

  await page.selectOption('[data-connection-target]', 'mobile_slow');
  await page.click('[data-calculate]');
  const slowText = await page.locator('[data-line-total]').innerText();

  await page.selectOption('[data-connection-target]', 'desktop');
  await page.click('[data-calculate]');
  const desktopText = await page.locator('[data-line-total]').innerText();

  const parseKb = s => parseFloat(s.replace(/[^0-9.]/g, ''));
  expect(parseKb(slowText)).toBeLessThan(parseKb(desktopText));
});

test('revenue block hidden when optional fields not filled', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-calculate]');
  await expect(page.locator('[data-revenue-block]')).toBeHidden();
});

test('revenue block shown when all optional fields filled and load time > 2s', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-site-type]', 'ecommerce');
  await page.fill('[data-monthly-visitors]', '10000');
  await page.fill('[data-current-load-time]', '5');
  await page.fill('[data-conversion-rate]', '2');
  await page.fill('[data-avg-order]', '50');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-revenue-block]')).toBeVisible();
});

test('annual gap is 12x monthly gap', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-site-type]', 'ecommerce');
  await page.fill('[data-monthly-visitors]', '10000');
  await page.fill('[data-current-load-time]', '5');
  await page.fill('[data-conversion-rate]', '2');
  await page.fill('[data-avg-order]', '50');
  await page.click('[data-calculate]');
  const monthlyText = await page.locator('[data-line-monthly-gap]').innerText();
  const annualText  = await page.locator('[data-line-annual-gap]').innerText();
  const parse = s => parseFloat(s.replace(/[^0-9.]/g, ''));
  expect(parse(annualText)).toBeCloseTo(parse(monthlyText) * 12, -2);
});

test('breakdown visible after submit', async ({ page }) => {
  await page.goto(URL);
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
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Website Performance Budget Calculator');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Performance Budget');
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

test('primary nav includes Productivity link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/productivity/"]')).toBeVisible();
});

test('productivity hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/productivity/');
  await expect(page.locator('.category-grid')).toContainText('Performance Budget');
});
