// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/seo/url-slug-generator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('URL Slug Generator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('breadcrumbs: Home > Calculators > SEO > URL Slug Generator', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'SEO', 'URL Slug Generator']);
});

test('live slug from simple heading', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('Hello World');
  await expect(page.locator('[data-slug-out]')).toHaveText('hello-world');
});

test('accented characters transliterated', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('Café Münster');
  await expect(page.locator('[data-slug-out]')).toHaveText('cafe-munster');
});

test('stop-word toggle strips common words', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('The quick brown fox');
  await page.locator('[data-remove-stops]').check();
  await expect(page.locator('[data-slug-out]')).toHaveText('quick-brown-fox');
});

test('underscore separator switches output', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('Hello World');
  await page.locator('[data-separator]').selectOption('_');
  await expect(page.locator('[data-slug-out]')).toHaveText('hello_world');
});

test('truncation respects word boundary', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('the quick brown fox jumps over the lazy dog');
  await page.locator('[data-max-length]').fill('20');
  const slug = await page.locator('[data-slug-out]').textContent();
  expect(slug.length).toBeLessThanOrEqual(20);
  expect(slug.endsWith('-')).toBe(false);
  await expect(page.locator('[data-line-truncated]')).toHaveText('Yes');
});

test('numbers preserved', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('2025 Best Practices');
  await expect(page.locator('[data-slug-out]')).toHaveText('2025-best-practices');
});

test('dataLayer fires once slug produced', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('hello world');
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'URL Slug Generator');
  expect(hit).toBeTruthy();
});

test('SEO hub lists URL slug generator', async ({ page }) => {
  await page.goto('/calculators/seo/');
  await expect(page.locator('a[href="/calculators/seo/url-slug-generator/"]')).toBeVisible();
});

test('primary nav includes SEO link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/seo/"]')).toHaveCount(1);
});
