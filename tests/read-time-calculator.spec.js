'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/writing/read-time-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Read Time Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs: Home > Calculators > Writing > Read Time Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Writing');
  await expect(crumbs.nth(3)).toContainText('Read Time');
});

test('starts with zero counts and nothing entered', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-line-words]')).toHaveText('0');
  await expect(page.locator('[data-result-silent]')).toContainText('0 sec');
});

test('typing updates counts live', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-text]', 'Hello world this is a test.');
  await expect(page.locator('[data-line-words]')).toHaveText('6');
  await expect(page.locator('[data-line-sentences]')).toHaveText('1');
});

test('500-word text at default WPMs → 2 min silent', async ({ page }) => {
  const text = Array(500).fill('word').join(' ');
  await page.goto(URL);
  await page.fill('[data-text]', text);
  await expect(page.locator('[data-line-words]')).toHaveText('500');
  await expect(page.locator('[data-line-silent]')).toContainText('2 min');
});

test('changing silent WPM updates silent time', async ({ page }) => {
  const text = Array(500).fill('word').join(' ');
  await page.goto(URL);
  await page.fill('[data-text]', text);
  await page.fill('[data-silent-wpm]', '500');
  await expect(page.locator('[data-line-silent]')).toContainText('1 min');
});

test('dataLayer receives event when first word typed', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => { window.dataLayer = []; });
  await page.fill('[data-text]', 'just a few words here');
  const events = await page.evaluate(() => window.dataLayer.map(e => e.event));
  expect(events).toContain('calculator_interaction');
});

test('prove-it workings populated with counts', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-text]', 'one two three four five');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Words: 5');
});

test('writing hub lists read time calculator', async ({ page }) => {
  await page.goto('/calculators/writing/');
  await expect(page.locator('a[href="/calculators/writing/read-time-calculator/"]')).toBeVisible();
});

test('primary nav includes Writing link', async ({ page }) => {
  await page.goto(URL);
  const link = page.locator('.primary-nav__submenu a[href="/calculators/writing/"]');
  await expect(link).toHaveCount(1);
});
