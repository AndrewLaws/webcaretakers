// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/writing/english-to-suffolk-translator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('English to Suffolk Translator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('breadcrumbs: Home > Calculators > Writing > English to Suffolk Translator', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Writing', 'English to Suffolk Translator']);
});

test('starts empty', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-words-total]')).toHaveText('0');
});

test('translates "the old man" correctly', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill('the old man');
  const out = await page.locator('[data-output]').textContent();
  expect(out).toMatch(/tha owd bor/);
});

test('preserves leading capital', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill('The old friend');
  const out = await page.locator('[data-output]').textContent();
  expect(out).toMatch(/^Tha\b/);
});

test('translates contraction "what\'s"', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill("what's that");
  const out = await page.locator('[data-output]').textContent();
  expect(out).toMatch(/woss/);
});

test('translates "I" to "Oi"', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill('I am going home');
  const out = await page.locator('[data-output]').textContent();
  expect(out).toMatch(/^Oi /);
});

test('counts words translated', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill('the old man');
  await expect(page.locator('[data-words-total]')).toHaveText('3');
  const changed = await page.locator('[data-words-changed]').textContent();
  expect(parseInt(changed, 10)).toBeGreaterThanOrEqual(2);
});

test('sample button populates input and output', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-sample]').click();
  await expect(page.locator('[data-input]')).not.toHaveValue('');
  const out = await page.locator('[data-output]').textContent();
  expect(out.length).toBeGreaterThan(10);
});

test('does not partially translate "together"', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill('together');
  const out = await page.locator('[data-output]').textContent();
  expect(out.trim()).toBe('together');
});

test('dataLayer fires on first input', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-input]').fill('hello');
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'English to Suffolk Translator');
  expect(hit).toBeTruthy();
});

test('Writing hub lists the translator', async ({ page }) => {
  await page.goto('/calculators/writing/');
  await expect(page.locator('a[href="/calculators/writing/english-to-suffolk-translator/"]')).toBeVisible();
});
