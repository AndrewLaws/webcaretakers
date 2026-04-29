// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/conversions/cooking-measurements-converter/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Cooking Measurements Converter');
});

test('breadcrumbs end at Cooking Measurements Converter', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Conversions', 'Cooking Measurements Converter']);
});

test('does not use data-calculator attribute (avoids GTM name corruption)', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-calculator]')).toHaveCount(0);
});

test('has calculator-card sections for convention, volume, weight, temperature and ingredient', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.calculator-card')).toHaveCount(5);
});

test('volume: 1 US cup converts to 240 ml', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-vol-from]').selectOption('us-cup');
  await page.locator('[data-vol-to]').selectOption('millilitre');
  await page.locator('[data-vol-value]').fill('1');
  await page.locator('[data-vol-value]').blur();
  const text = await page.locator('[data-vol-result]').textContent();
  expect(text).toMatch(/240/);
});

test('volume: 1 UK pint converts to 568.26 ml', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-vol-from]').selectOption('uk-pint');
  await page.locator('[data-vol-to]').selectOption('millilitre');
  await page.locator('[data-vol-value]').fill('1');
  await page.locator('[data-vol-value]').blur();
  const text = await page.locator('[data-vol-result]').textContent();
  expect(text).toMatch(/568/);
});

test('weight: 1 lb converts to 453.59 g', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-wt-from]').selectOption('pound');
  await page.locator('[data-wt-to]').selectOption('gram');
  await page.locator('[data-wt-value]').fill('1');
  await page.locator('[data-wt-value]').blur();
  const text = await page.locator('[data-wt-result]').textContent();
  expect(text).toMatch(/453/);
});

test('weight: 1 oz converts to 28.35 g', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-wt-from]').selectOption('ounce');
  await page.locator('[data-wt-to]').selectOption('gram');
  await page.locator('[data-wt-value]').fill('1');
  await page.locator('[data-wt-value]').blur();
  const text = await page.locator('[data-wt-result]').textContent();
  expect(text).toMatch(/28\.3/);
});

test('temperature: 180 C converts to 356 F', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-temp-from]').selectOption('celsius');
  await page.locator('[data-temp-to]').selectOption('fahrenheit');
  await page.locator('[data-temp-value]').fill('180');
  await page.locator('[data-temp-value]').blur();
  const text = await page.locator('[data-temp-result]').textContent();
  expect(text).toMatch(/356/);
});

test('temperature: 180 C is gas mark 4', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-temp-from]').selectOption('celsius');
  await page.locator('[data-temp-to]').selectOption('gas-mark');
  await page.locator('[data-temp-value]').fill('180');
  await page.locator('[data-temp-value]').blur();
  const text = await page.locator('[data-temp-result]').textContent();
  expect(text).toMatch(/4/);
});

test('temperature: gas mark 6 is 200 C', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-temp-from]').selectOption('gas-mark');
  await page.locator('[data-temp-to]').selectOption('celsius');
  await page.locator('[data-temp-value]').fill('6');
  await page.locator('[data-temp-value]').blur();
  const text = await page.locator('[data-temp-result]').textContent();
  expect(text).toMatch(/200/);
});

test('ingredient: 1 cup plain flour to grams (defaults metric cup)', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-ing-ingredient]').selectOption('plain-flour');
  await page.locator('[data-ing-cups]').fill('1');
  await page.locator('[data-ing-cups]').blur();
  const text = await page.locator('[data-ing-result]').textContent();
  // metric cup (250ml) of plain flour ~ 130g
  expect(text).toMatch(/\d+\s*g/);
});

test('ingredient: 1 cup butter (US cup convention) is about 227g', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-cup-convention]').selectOption('us');
  await page.locator('[data-ing-ingredient]').selectOption('butter');
  await page.locator('[data-ing-cups]').fill('1');
  await page.locator('[data-ing-cups]').blur();
  const text = await page.locator('[data-ing-result]').textContent();
  expect(text).toMatch(/22[67]/);
});

test('cup convention toggle defaults to metric', async ({ page }) => {
  await page.goto(URL);
  const val = await page.locator('[data-cup-convention]').inputValue();
  expect(val).toBe('metric');
});

test('FAQ section present', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.faq')).toBeVisible();
});

test('Schema.org SoftwareApplication present', async ({ page }) => {
  await page.goto(URL);
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const joined = scripts.join('\n');
  expect(joined).toMatch(/"SoftwareApplication"/);
  expect(joined).toMatch(/"FAQPage"/);
});

test('dataLayer fires calculator_interaction on input', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-vol-value]').fill('2');
  await page.locator('[data-vol-value]').blur();
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Cooking Measurements Converter');
  expect(hit).toBeTruthy();
});

test('Conversions hub lists Cooking Measurements Converter', async ({ page }) => {
  await page.goto('/calculators/conversions/');
  await expect(page.locator('a[href="/calculators/conversions/cooking-measurements-converter/"]').first()).toBeVisible();
});

test.describe('Prove it panel', () => {
  test('button is present on initial load', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('button[data-prove-it]')).toBeVisible();
  });

  test('clicking the button reveals the body and updates aria-expanded', async ({ page }) => {
    await page.goto(URL);
    const btn = page.locator('button[data-prove-it]');
    const body = page.locator('[data-prove-body]');
    await expect(body).toBeHidden();
    await btn.click();
    await expect(body).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  test('body contains a step using the user input number', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-vol-value]').fill('3');
    await page.locator('[data-vol-value]').blur();
    await page.locator('button[data-prove-it]').click();
    const text = await page.locator('[data-prove-body]').textContent();
    expect(text).toMatch(/3/);
    expect(text).toMatch(/Volume/);
  });

  test('dataLayer captures prove_it action on click', async ({ page }) => {
    await page.goto(URL);
    await page.locator('button[data-prove-it]').click();
    const dl = await page.evaluate(() => window.dataLayer);
    const hit = dl.find(e => e.event === 'calculator_interaction' && e.action === 'prove_it' && e.calculator_name === 'Cooking Measurements Converter');
    expect(hit).toBeTruthy();
  });
});

test('related calculators links to unit converter and tip calculator', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.related-calculators a[href="/calculators/conversions/unit-converter/"]')).toBeVisible();
  await expect(page.locator('.related-calculators a[href="/calculators/finance/tip-calculator/"]')).toBeVisible();
});
