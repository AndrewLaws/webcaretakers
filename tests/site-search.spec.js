// @ts-check
const { test, expect } = require('@playwright/test');

test('search bar is injected above the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-site-search]')).toBeVisible();
  // The search bar should come before the header in the DOM.
  const order = await page.evaluate(() => {
    const bar = document.querySelector('.site-search-bar');
    const header = document.querySelector('.site-header');
    if (!bar || !header) return 'missing';
    return bar.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING
      ? 'bar-first'
      : 'header-first';
  });
  expect(order).toBe('bar-first');
});

test('search index loads and responds to query', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-site-search-input]').focus();
  // Wait briefly for the index fetch
  await page.waitForTimeout(300);
  await page.locator('[data-site-search-input]').fill('mortgage');
  await expect(page.locator('[data-site-search-results] li').first()).toBeVisible();
  const texts = await page.locator('[data-site-search-results] li').allTextContents();
  expect(texts.join(' ').toLowerCase()).toContain('mortgage');
});

test('no matches shows an empty state', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-site-search-input]').focus();
  await page.waitForTimeout(300);
  await page.locator('[data-site-search-input]').fill('qqqwertzxcv');
  await expect(page.locator('.site-search__empty')).toBeVisible();
});

test('Enter navigates to the first result', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('[data-site-search-input]');
  await input.focus();
  await page.waitForTimeout(300);
  await input.fill('bmi');
  await expect(page.locator('[data-site-search-results] li').first()).toBeVisible();
  await input.press('Enter');
  await expect(page).toHaveURL(/\/calculators\/health\/bmi-calculator\/?$/);
});

test('Escape closes the dropdown', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('[data-site-search-input]');
  await input.focus();
  await page.waitForTimeout(300);
  await input.fill('mortgage');
  await expect(page.locator('[data-site-search-results] li').first()).toBeVisible();
  await input.press('Escape');
  await expect(page.locator('[data-site-search-results]')).toBeHidden();
});

test('search bar also appears on a deep calculator page', async ({ page }) => {
  await page.goto('/calculators/writing/word-count/');
  await expect(page.locator('[data-site-search]')).toBeVisible();
});

test('search matches categories as well as tools', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('[data-site-search-input]');
  await input.focus();
  await page.waitForTimeout(300);
  await input.fill('conversions');
  await expect(page.locator('[data-site-search-results] li').first()).toBeVisible();
  const texts = await page.locator('[data-site-search-results] li').allTextContents();
  expect(texts.join(' ').toLowerCase()).toContain('conversions');
});
