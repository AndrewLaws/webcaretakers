// @ts-check
const { test, expect } = require('@playwright/test');

const URL = '/calculators/conversions/time-zone-converter/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveText('Time Zone Converter');
});

test('breadcrumbs end at Time Zone Converter', async ({ page }) => {
  await page.goto(URL);
  const items = await page.locator('.breadcrumbs li').allTextContents();
  expect(items.map(s => s.trim())).toEqual(['Home', 'Calculators', 'Conversions', 'Time Zone Converter']);
});

test('ELI5 paragraph is present', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
  await expect(page.locator('.eli5 p')).toContainText(/3pm.*London/);
});

test('SoftwareApplication and FAQPage JSON-LD present', async ({ page }) => {
  await page.goto(URL);
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const joined = scripts.join('\n');
  expect(joined).toMatch(/"SoftwareApplication"/);
  expect(joined).toMatch(/"FAQPage"/);
  expect(joined).toMatch(/"UtilitiesApplication"/);
});

test('source zone select is populated and date/time defaulted', async ({ page }) => {
  await page.goto(URL);
  const opts = page.locator('[data-source-zone] option');
  const count = await opts.count();
  expect(count).toBeGreaterThan(20);
  await expect(page.locator('[data-date]')).not.toHaveValue('');
  await expect(page.locator('[data-time]')).not.toHaveValue('');
});

test('three default target zone rows render on load', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-targets] .tzc-target')).toHaveCount(3);
});

test('London 12:00 in summer renders as 13:00 BST', async ({ page }) => {
  await page.goto(URL);
  // Force London as source via custom input (deterministic across runners)
  await page.locator('[data-source-zone]').selectOption('Europe/London');
  await page.locator('[data-date]').fill('2026-07-01');
  await page.locator('[data-time]').fill('12:00');
  await expect(page.locator('[data-source-label]')).toContainText(/12:00/);
  await expect(page.locator('[data-source-label]')).toContainText(/UTC\+1/);
});

test('international date line: London Tue 23:00 is Auckland Wed', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-source-zone]').selectOption('Europe/London');
  // 13 Jan 2026 is a Tuesday in winter (London on GMT, Auckland on NZDT +13)
  await page.locator('[data-date]').fill('2026-01-13');
  await page.locator('[data-time]').fill('23:00');

  // Set a target row to Auckland
  const firstTarget = page.locator('[data-targets] .tzc-target').first();
  await firstTarget.locator('[data-target-zone]').selectOption('Pacific/Auckland');

  const text = await firstTarget.locator('[data-target-result]').textContent();
  expect(text).toMatch(/Wed/);
  expect(text).toMatch(/12:00/);
});

test('Now button repopulates the date and time', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-date]').fill('2020-01-01');
  await page.locator('[data-time]').fill('00:00');
  await page.locator('[data-now-btn]').click();
  const dv = await page.locator('[data-date]').inputValue();
  expect(dv).not.toBe('2020-01-01');
});

test('Add zone button adds a fourth row', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-targets] .tzc-target')).toHaveCount(3);
  await page.locator('[data-add-zone]').click();
  await expect(page.locator('[data-targets] .tzc-target')).toHaveCount(4);
});

test('12-hour toggle changes the time formatting', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-source-zone]').selectOption('Europe/London');
  await page.locator('[data-date]').fill('2026-07-01');
  await page.locator('[data-time]').fill('14:00');
  await expect(page.locator('[data-source-label]')).toContainText(/14:00/);
  await page.locator('[data-hour12]').check();
  await expect(page.locator('[data-source-label]')).toContainText(/2:00/);
});

test('UTC source zone passes through unchanged', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-source-zone]').selectOption('UTC');
  await page.locator('[data-date]').fill('2026-04-27');
  await page.locator('[data-time]').fill('14:30');
  await expect(page.locator('[data-source-label]')).toContainText(/14:30/);
  await expect(page.locator('[data-source-label]')).toContainText(/UTC\+0/);
});

test('Prove-it details panel reveals UTC anchor', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-source-zone]').selectOption('UTC');
  await page.locator('[data-date]').fill('2026-04-27');
  await page.locator('[data-time]').fill('14:30');
  const details = page.locator('details[data-prove-it]');
  await details.locator('summary').click();
  await expect(details.locator('[data-utc-anchor]').first()).toContainText('2026-04-27T14:30');
});

test('dataLayer fires calculator_interaction on input change', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-time]').fill('09:00');
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Time Zone Converter');
  expect(hit).toBeTruthy();
});

test('dataLayer fires prove_it when details opened', async ({ page }) => {
  await page.goto(URL);
  await page.locator('details[data-prove-it] summary').click();
  await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
  const dl = await page.evaluate(() => window.dataLayer);
  const hit = dl.find(e => e.event === 'prove_it' && e.calculator_name === 'Time Zone Converter');
  expect(hit).toBeTruthy();
});

test('Conversions hub lists Time Zone Converter', async ({ page }) => {
  await page.goto('/calculators/conversions/');
  await expect(page.locator('a[href="/calculators/conversions/time-zone-converter/"]').first()).toBeVisible();
});

test('All calculators hub lists Time Zone Converter', async ({ page }) => {
  await page.goto('/calculators/');
  await expect(page.locator('a[href="/calculators/conversions/time-zone-converter/"]').first()).toBeVisible();
});
