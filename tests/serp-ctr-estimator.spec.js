// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/seo/serp-ctr-estimator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('SERP CTR Estimator by Position');
});

test('breadcrumbs: Home > Calculators > SEO > SERP CTR Estimator by Position', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual([
    'Home', 'Calculators', 'SEO', 'SERP CTR Estimator by Position'
  ]);
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('default render produces a non-empty expected clicks figure', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(300);
  const expected = await page.locator('[data-result-expected]').textContent();
  expect(expected).not.toBe('—');
  expect(expected && expected.length).toBeGreaterThan(0);
});

test('changing volume to 100,000 at P1 returns ~39,800 expected clicks under AWR', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-volume]').fill('100000');
  await page.locator('[data-position]').fill('1');
  await page.waitForTimeout(300);
  const expected = await page.locator('[data-result-expected]').textContent();
  // Number formatting uses en-GB grouping. Strip non-digits before checking.
  const n = parseInt((expected || '').replace(/[^0-9]/g, ''), 10);
  expect(n).toBeGreaterThan(39000);
  expect(n).toBeLessThan(41000);
});

test('comparison table has 10 rows', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(300);
  const rows = page.locator('[data-comparison-tbody] tr');
  await expect(rows).toHaveCount(10);
});

test('switching to Backlinko curve changes the CTR shown', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-volume]').fill('10000');
  await page.locator('[data-position]').fill('1');
  await page.waitForTimeout(300);
  const ctrAwr = await page.locator('[data-result-ctr]').textContent();
  await page.locator('input[name="ctr-curve"][value="backlinko"]').check();
  await page.waitForTimeout(300);
  const ctrBl = await page.locator('[data-result-ctr]').textContent();
  expect(ctrAwr).not.toBe(ctrBl);
});

test('prove-it panel shows the formula and working', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(300);
  await page.locator('[data-prove-it] summary').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Formula');
  expect(body).toContain('volume');
});

test('dataLayer fires calculator_interaction and calculator_result', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-volume]').fill('5000');
  await page.locator('[data-position]').fill('4');
  await page.waitForTimeout(400);
  const dl = await page.evaluate(() => window.dataLayer);
  const interaction = dl.find(e => e.event === 'calculator_interaction'
    && e.calculator_name === 'SERP CTR Estimator by Position');
  const result = dl.find(e => e.event === 'calculator_result'
    && e.calculator_name === 'SERP CTR Estimator by Position');
  expect(interaction).toBeTruthy();
  expect(result).toBeTruthy();
});

test('prove_it event fires when prove-it panel opens', async ({ page }) => {
  await page.goto(URL);
  await page.waitForTimeout(200);
  await page.locator('[data-prove-it] summary').click();
  await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'prove_it'
    && e.calculator_name === 'SERP CTR Estimator by Position');
  expect(hit).toBeTruthy();
});

test('JSON-LD blocks parse and contain SoftwareApplication and FAQPage', async ({ page }) => {
  await page.goto(URL);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = blocks.map(b => JSON.parse(b));
  const types = parsed.map(p => p['@type']);
  expect(types).toContain('SoftwareApplication');
  expect(types).toContain('FAQPage');
  const sa = parsed.find(p => p['@type'] === 'SoftwareApplication');
  expect(sa.applicationCategory).toBe('BusinessApplication');
});

test('SEO hub lists serp-ctr-estimator', async ({ page }) => {
  await page.goto('/calculators/seo/');
  await expect(page.locator('a[href="/calculators/seo/serp-ctr-estimator/"]')).toBeVisible();
});

test('all-calculators hub lists serp-ctr-estimator', async ({ page }) => {
  await page.goto('/calculators/');
  await expect(page.locator('a[href="/calculators/seo/serp-ctr-estimator/"]')).toBeVisible();
});
