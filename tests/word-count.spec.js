// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/writing/word-count/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Word Count Tool');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('breadcrumbs: Home > Calculators > Writing > Word Count Tool', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Writing', 'Word Count Tool']);
});

test('starts with zero counts', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-line-words]')).toHaveText('0');
  await expect(page.locator('[data-line-chars]')).toHaveText('0');
  await expect(page.locator('[data-line-paragraphs]')).toHaveText('0');
});

test('typing updates counts live', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('Hello world');
  await expect(page.locator('[data-line-words]')).toHaveText('2');
  await expect(page.locator('[data-line-chars]')).toHaveText('11');
  await expect(page.locator('[data-line-chars-no-ws]')).toHaveText('10');
});

test('shows "—" for empty limit status', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-limit-tweet]')).toHaveText('—');
});

test('under-cap limits show remaining', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('x'.repeat(50));
  // tweet cap 280, 50 chars → 230 left
  await expect(page.locator('[data-limit-tweet]')).toContainText('230 left');
});

test('over-cap limits show overflow', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('x'.repeat(200));
  // meta cap 160, over by 40
  await expect(page.locator('[data-limit-meta]')).toContainText('over by 40');
});

test('paragraph count: two blank-line separated paragraphs', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('first para\n\nsecond para');
  await expect(page.locator('[data-line-paragraphs]')).toHaveText('2');
});

test('dataLayer fires on first word typed', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('hello');
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Word Count Tool');
  expect(hit).toBeTruthy();
});

test('prove-it workings populated', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('one two three');
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Words:');
  expect(body).toContain('3');
});

test('writing hub lists word count tool', async ({ page }) => {
  await page.goto('/calculators/writing/');
  await expect(page.locator('a[href="/calculators/writing/word-count/"]')).toBeVisible();
});
