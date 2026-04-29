// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/seo/robots-txt-tester/';

const SAMPLE = [
  'User-agent: *',
  'Disallow: /private/',
  'Allow: /private/public.html',
  '',
  'User-agent: Googlebot',
  'Disallow: /no-google/',
  '',
  'Sitemap: https://example.com/sitemap.xml',
].join('\n');

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Robots.txt Tester');
});

test('breadcrumbs: Home > Calculators > SEO > Robots.txt Tester', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'SEO', 'Robots.txt Tester']);
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('single-URL test marks blocked path as Blocked', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/private/secret.html');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-verdict-badge]')).toHaveText('Blocked');
  await expect(page.locator('[data-verdict-rule]')).toContainText('Disallow: /private/');
});

test('Allow override beats shorter Disallow', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/private/public.html');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-verdict-badge]')).toHaveText('Allowed');
  await expect(page.locator('[data-verdict-rule]')).toContainText('Allow: /private/public.html');
});

test('most specific user-agent group wins', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/no-google/page');
  await page.locator('[data-ua-select]').selectOption('Googlebot');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-verdict-badge]')).toHaveText('Blocked');
  await expect(page.locator('[data-verdict-group]')).toContainText('Googlebot');
});

test('multi-URL mode produces a results table', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('input[name="robots-mode"][value="multi"]').check();
  await page.locator('[data-robots-urls]').fill('/\n/private/secret.html\n/private/public.html');
  await page.waitForTimeout(400);
  const rows = page.locator('[data-multi-tbody] tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Allowed');
  await expect(rows.nth(1)).toContainText('Blocked');
  await expect(rows.nth(2)).toContainText('Allowed');
});

test('sitemap lines are extracted and shown', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-sitemaps]')).toBeVisible();
  await expect(page.locator('[data-sitemaps-list]')).toContainText('https://example.com/sitemap.xml');
});

test('prove-it panel shows candidate rules and decision', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/private/public.html');
  await page.waitForTimeout(400);
  await page.locator('[data-prove-it] summary').click();
  const body = await page.locator('[data-prove-it-body]').textContent();
  expect(body).toContain('Candidate rules');
  expect(body).toContain('ALLOWED');
});

test('dataLayer fires calculator_interaction and calculator_result', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/private/x');
  await page.waitForTimeout(400);
  const dl = await page.evaluate(() => window.dataLayer);
  const interaction = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Robots.txt Tester');
  const result      = dl.find(e => e.event === 'calculator_result'      && e.calculator_name === 'Robots.txt Tester');
  expect(interaction).toBeTruthy();
  expect(result).toBeTruthy();
});

test('prove_it event fires when prove-it panel opens', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-robots-body]').fill(SAMPLE);
  await page.locator('[data-robots-url]').fill('/');
  await page.waitForTimeout(400);
  await page.locator('[data-prove-it] summary').click();
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'prove_it' && e.calculator_name === 'Robots.txt Tester');
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

test('SEO hub lists robots.txt tester', async ({ page }) => {
  await page.goto('/calculators/seo/');
  await expect(page.locator('a[href="/calculators/seo/robots-txt-tester/"]').first()).toBeVisible();
});

test('all-calculators hub lists robots.txt tester', async ({ page }) => {
  await page.goto('/calculators/');
  await expect(page.locator('a[href="/calculators/seo/robots-txt-tester/"]').first()).toBeVisible();
});
