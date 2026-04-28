// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/seo/serp-snippet-preview/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('SERP Snippet Preview Tool');
});

test('breadcrumbs: Home > Calculators > SEO > SERP Snippet Preview Tool', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'SEO', 'SERP Snippet Preview Tool']);
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5 h2')).toContainText("Explain like I'm 5");
});

test('placeholder text shows when inputs are empty', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-desktop-title]')).toContainText('Your title appears here');
  await expect(page.locator('[data-mobile-title]')).toContainText('Your title appears here');
});

test('typing a title updates both desktop and mobile previews', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-title]').fill('UK Mortgage Overpayment Calculator | WebCaretakers');
  await page.waitForTimeout(200);
  await expect(page.locator('[data-desktop-title]')).toContainText('UK Mortgage Overpayment Calculator');
  await expect(page.locator('[data-mobile-title]')).toContainText('UK Mortgage Overpayment Calculator');
});

test('long title that overflows shows truncation warning', async ({ page }) => {
  await page.goto(URL);
  // A title that comfortably exceeds 600px in 20px Arial bold.
  const longTitle = 'WebCaretakers Calculator Hub for Mortgage Overpayments and SEO Snippet Tools and More Useful Things';
  await page.locator('[data-serp-title]').fill(longTitle);
  await page.waitForTimeout(200);
  // The desktop preview should end with an ellipsis.
  const desktopText = await page.locator('[data-desktop-title]').innerText();
  expect(desktopText).toMatch(/\.\.\.$/);
  // The desktop warning should be visible.
  await expect(page.locator('[data-desktop-warning]')).toBeVisible();
});

test('description with hard line breaks renders multiple lines', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-description]').fill('First line of the description.\nSecond line of the description.');
  await page.waitForTimeout(200);
  const html = await page.locator('[data-desktop-description]').innerHTML();
  expect(html).toContain('<div>');
});

test('URL with subdirectories renders as breadcrumb chevrons', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-url]').fill('https://example.com/blog/2024/post-name');
  await page.waitForTimeout(200);
  const desktop = await page.locator('[data-desktop-url]').innerText();
  expect(desktop).toContain('example.com');
  expect(desktop).toContain('blog');
  expect(desktop).toContain('post-name');
  // Chevron glyph.
  expect(desktop).toContain('\u203A');
});

test('pixel meters update as user types', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-title]').fill('Hello');
  await page.waitForTimeout(200);
  const before = await page.locator('[data-desktop-title-value]').innerText();
  await page.locator('[data-serp-title]').fill('Hello world this is a longer title');
  await page.waitForTimeout(200);
  const after = await page.locator('[data-desktop-title-value]').innerText();
  // Both should match the "N / 600 px" format and after must be larger.
  const numBefore = parseInt(before.split('/')[0].trim(), 10);
  const numAfter  = parseInt(after.split('/')[0].trim(), 10);
  expect(numAfter).toBeGreaterThan(numBefore);
  expect(after).toContain('600 px');
});

test('emoji and em-dash in input render without crashing', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-title]').fill('Pricing \u2014 plans and offers \u{1F680}');
  await page.waitForTimeout(200);
  const txt = await page.locator('[data-desktop-title]').innerText();
  expect(txt.length).toBeGreaterThan(0);
});

test('prove-it panel shows a measured pixel width', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-title]').fill('A measurable title');
  await page.waitForTimeout(200);
  await page.locator('[data-prove-it] summary').click();
  const w = await page.locator('[data-prove-title-width]').innerText();
  expect(parseInt(w, 10)).toBeGreaterThan(0);
});

test('dataLayer fires calculator_interaction and calculator_result', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-title]').fill('Test title for dataLayer');
  await page.waitForTimeout(300);
  const dl = await page.evaluate(() => window.dataLayer);
  const interaction = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'SERP Snippet Preview Tool');
  const result      = dl.find(e => e.event === 'calculator_result'      && e.calculator_name === 'SERP Snippet Preview Tool');
  expect(interaction).toBeTruthy();
  expect(result).toBeTruthy();
});

test('prove_it event fires when prove-it panel opens', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-serp-title]').fill('Title');
  await page.waitForTimeout(200);
  // Open the details element directly to avoid any overlay-click flakiness.
  await page.evaluate(() => {
    const d = document.querySelector('[data-prove-it]');
    if (d) d.open = true;
    if (d) d.dispatchEvent(new Event('toggle'));
  });
  await page.waitForTimeout(100);
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'prove_it' && e.calculator_name === 'SERP Snippet Preview Tool');
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

test('SEO hub lists SERP Snippet Preview Tool', async ({ page }) => {
  await page.goto('/calculators/seo/');
  await expect(page.locator('a[href="/calculators/seo/serp-snippet-preview/"]')).toBeVisible();
});

test('all-calculators hub lists SERP Snippet Preview Tool', async ({ page }) => {
  await page.goto('/calculators/');
  await expect(page.locator('a[href="/calculators/seo/serp-snippet-preview/"]')).toBeVisible();
});
