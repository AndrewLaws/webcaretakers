// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/conversions/unit-converter/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Unit Converter');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('breadcrumbs: Home > Calculators > Conversions > Unit Converter', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Conversions', 'Unit Converter']);
});

test('default load shows length conversions of 1', async ({ page }) => {
  await page.goto(URL);
  const text = await page.locator('[data-results]').textContent();
  expect(text).toMatch(/metre/i);
});

test('1 km converts to 1000 m', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-category]').selectOption('length');
  await page.locator('[data-from]').selectOption('kilometre');
  await page.locator('[data-value]').fill('1');
  await page.locator('[data-value]').blur();
  const text = await page.locator('[data-results]').textContent();
  expect(text).toMatch(/1,000/);
});

test('category switch repopulates units', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-category]').selectOption('mass');
  const fromOpts = await page.locator('[data-from] option').allTextContents();
  expect(fromOpts.join(' ').toLowerCase()).toMatch(/kilogram|pound/);
});

test('100 C converts to 212 F', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-category]').selectOption('temperature');
  await page.locator('[data-from]').selectOption('celsius');
  await page.locator('[data-value]').fill('100');
  await page.locator('[data-value]').blur();
  const text = await page.locator('[data-results]').textContent();
  expect(text).toMatch(/212/);
});

test('0 C converts to 273.15 K', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-category]').selectOption('temperature');
  await page.locator('[data-from]').selectOption('celsius');
  await page.locator('[data-value]').fill('0');
  await page.locator('[data-value]').blur();
  const text = await page.locator('[data-results]').textContent();
  expect(text).toMatch(/273\.15/);
});

test('60 mph converts to about 96.56 km/h', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-category]').selectOption('speed');
  await page.locator('[data-from]').selectOption('mile-per-hour');
  await page.locator('[data-value]').fill('60');
  await page.locator('[data-value]').blur();
  const text = await page.locator('[data-results]').textContent();
  expect(text).toMatch(/96\.5/);
});

test('dataLayer fires on first input', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-value]').fill('5');
  await page.locator('[data-value]').blur();
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Unit Converter');
  expect(hit).toBeTruthy();
});

test('Conversions hub lists unit converter', async ({ page }) => {
  await page.goto('/calculators/conversions/');
  await expect(page.locator('a[href="/calculators/conversions/unit-converter/"]')).toBeVisible();
});

test('nav includes Conversions link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/conversions/"]')).toHaveCount(1);
});
