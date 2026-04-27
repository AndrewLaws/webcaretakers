// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/seo/keyword-density-calculator/';

// Build a deterministic body that passes the 50-word threshold.
const SAMPLE = (
  'rental yield is a common metric for property investors and landlords. ' +
  'gross rental yield divides annual rent by the purchase price of the property. ' +
  'net rental yield subtracts running costs from the gross rental yield before the calculation. ' +
  'a healthy rental yield depends on the local market and the type of buyer. ' +
  'compare rental yield against mortgage interest, property tax, insurance and ongoing maintenance costs. ' +
  'most experienced landlords look for a rental yield above five percent in the current market. '
).trim();

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Keyword Density Calculator');
});

test('breadcrumbs: Home > Calculators > SEO > Keyword Density Calculator', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'SEO', 'Keyword Density Calculator']);
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('refuses to compute on short input', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill('Just a few words.');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-too-short]')).toBeVisible();
  await expect(page.locator('[data-results]')).toBeHidden();
});

test('computes density tables on adequate input', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill(SAMPLE);
  await page.waitForTimeout(400);
  await expect(page.locator('[data-results]')).toBeVisible();
  // Total words is shown as a localised number.
  const total = await page.locator('[data-total-words]').textContent();
  expect(parseInt(total.replace(/\D/g, ''), 10)).toBeGreaterThanOrEqual(50);
  // The unigram table has at least one row with content.
  await expect(page.locator('[data-unigrams] tr').first()).toBeVisible();
  // 'rental' should appear in the top unigrams (with stop words filtered).
  const uniText = await page.locator('[data-unigrams]').textContent();
  expect(uniText.toLowerCase()).toContain('rental');
  // 'rental yield' should appear in the bigrams.
  const biText = await page.locator('[data-bigrams]').textContent();
  expect(biText.toLowerCase()).toContain('rental yield');
});

test('stop-word toggle changes the unigram table', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill(SAMPLE);
  await page.waitForTimeout(400);
  // With filter on (default), 'the' should not appear as a unigram row.
  const uniRowsOn = await page.locator('[data-unigrams] td:first-child').allTextContents();
  expect(uniRowsOn.map(s => s.trim().toLowerCase())).not.toContain('the');
  // Switch the filter off; 'the' should now appear in the unigrams.
  await page.locator('[data-remove-stops]').uncheck();
  await page.waitForTimeout(100);
  const uniRowsOff = await page.locator('[data-unigrams] td:first-child').allTextContents();
  expect(uniRowsOff.map(s => s.trim().toLowerCase())).toContain('the');
});

test('prove-it panel shows tokenisation working', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill(SAMPLE);
  await page.waitForTimeout(400);
  await page.locator('[data-prove-it] summary').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Tokens 1 to');
  expect(body).toContain('Density:');
});

test('dataLayer fires calculator_interaction and calculator_result', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill(SAMPLE);
  await page.waitForTimeout(400);
  const dl = await page.evaluate(() => window.dataLayer);
  const interaction = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Keyword Density Calculator');
  const result      = dl.find(e => e.event === 'calculator_result'      && e.calculator_name === 'Keyword Density Calculator');
  expect(interaction).toBeTruthy();
  expect(result).toBeTruthy();
});

test('prove_it event fires when prove-it panel opens', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-text]').fill(SAMPLE);
  await page.waitForTimeout(400);
  await page.locator('[data-prove-it] summary').click();
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'prove_it' && e.calculator_name === 'Keyword Density Calculator');
  expect(hit).toBeTruthy();
});

test('JSON-LD blocks parse and contain SoftwareApplication and FAQPage', async ({ page }) => {
  await page.goto(URL);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const parsed = blocks.map(b => JSON.parse(b));
  const types  = parsed.map(p => p['@type']);
  expect(types).toContain('SoftwareApplication');
  expect(types).toContain('FAQPage');
  const sa = parsed.find(p => p['@type'] === 'SoftwareApplication');
  expect(sa.applicationCategory).toBe('BusinessApplication');
});

test('SEO hub lists keyword density calculator', async ({ page }) => {
  await page.goto('/calculators/seo/');
  await expect(page.locator('a[href="/calculators/seo/keyword-density-calculator/"]')).toBeVisible();
});

test('all-calculators hub lists keyword density calculator', async ({ page }) => {
  await page.goto('/calculators/');
  await expect(page.locator('a[href="/calculators/seo/keyword-density-calculator/"]')).toBeVisible();
});

test('primary nav includes SEO link', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/seo/"]')).toHaveCount(1);
});
