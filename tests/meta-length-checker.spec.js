// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/seo/meta-length-checker/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Meta Title and Description Length Checker');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('breadcrumbs: Home > Calculators > SEO > Meta Length Checker', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'SEO', 'Meta Length Checker']);
});

test('starts empty', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-title-status]')).toHaveText('empty');
  await expect(page.locator('[data-desc-status]')).toHaveText('empty');
});

test('short title classified short', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-title]').fill('Hi');
  await expect(page.locator('[data-title-status]')).toHaveText('short');
});

test('over-long title classified over', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-title]').fill('x'.repeat(80));
  await expect(page.locator('[data-title-status]')).toHaveText('over');
});

test('description over cap classified over', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-description]').fill('x'.repeat(200));
  await expect(page.locator('[data-desc-status]')).toHaveText('over');
});

test('character counts update live', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-title]').fill('Hello world');
  await expect(page.locator('[data-title-chars]')).toHaveText('11');
});

test('pixel width counted', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-title]').fill('MMMMM');
  const px = await page.locator('[data-title-px]').textContent();
  expect(parseInt(px, 10)).toBeGreaterThan(30);
});

test('dataLayer fires on first input', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-title]').fill('Hello');
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Meta Length Checker');
  expect(hit).toBeTruthy();
});

test('SEO hub lists meta length checker', async ({ page }) => {
  await page.goto('/calculators/seo/');
  await expect(page.locator('a[href="/calculators/seo/meta-length-checker/"]').first()).toBeVisible();
});

test('prove-it workings populated', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-title]').fill('Hello');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Title:');
  expect(body).toContain('Description:');
});
