// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/writing/suffolk-lorem-ipsum/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Suffolk Lorem Ipsum Generator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('breadcrumbs: Home > Calculators > Writing > Suffolk Lorem Ipsum', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Writing', 'Suffolk Lorem Ipsum']);
});

test('initial output is populated', async ({ page }) => {
  await page.goto(URL);
  const text = await page.locator('[data-output]').textContent();
  expect(text.length).toBeGreaterThan(50);
});

test('default classic opener starts with Hare we goo', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-generate]').click();
  const text = await page.locator('[data-output]').textContent();
  expect(text).toMatch(/^Hare we goo together/);
});

test('paragraph count changes output', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-paragraphs]').fill('5');
  await page.locator('[data-generate]').click();
  const paras = await page.locator('[data-output] p').count();
  expect(paras).toBe(5);
});

test('unchecking classic opener changes the first line', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-classic]').uncheck();
  await page.locator('[data-generate]').click();
  const text = await page.locator('[data-output]').textContent();
  expect(text).not.toMatch(/^Hare we goo together/);
});

test('out-of-range paragraph count shows error', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-paragraphs]').fill('999');
  await page.locator('[data-generate]').click();
  await expect(page.locator('[data-error]')).toBeVisible();
});

test('output contains a Suffolk word', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-generate]').click();
  const text = await page.locator('[data-output]').textContent();
  // Any one of the classic Suffolk markers ought to appear in a few paragraphs.
  expect(text.toLowerCase()).toMatch(/bor|mawther|squit|mardle|blarst|owd|on tha huh/);
});

test('dataLayer fires on first generate', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-generate]').click();
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Suffolk Lorem Ipsum Generator');
  expect(hit).toBeTruthy();
});

test('Writing hub lists Suffolk Lorem Ipsum', async ({ page }) => {
  await page.goto('/calculators/writing/');
  await expect(page.locator('a[href="/calculators/writing/suffolk-lorem-ipsum/"]').first()).toBeVisible();
});

test('prove-it workings populated', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-generate]').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Paragraphs:');
  expect(body).toContain('Total characters:');
});
