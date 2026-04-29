'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/health/running-pace-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Running Pace Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Health > Running Pace Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(2)).toContainText('Health');
  await expect(crumbs.nth(3)).toContainText('Running Pace');
});

test('breakdown hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('default mode is Find Pace (pace radio checked)', async ({ page }) => {
  await page.goto(URL);
  const paceRadio = page.locator('input[name="mode"][value="pace"]');
  await expect(paceRadio).toBeChecked();
});

test('find pace: 5km in 25:00 → pace 5:00 /km', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '5');
  await page.fill('[data-input-time]', '25:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
  await expect(page.locator('[data-line-pace]')).toContainText('5:00');
});

test('find pace: 10km in 50:00 → speed 12.00 km/h', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-speed-kmh]')).toContainText('12');
});

test('find time mode: 10km at 5:00 pace → finish time 50:00', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[name="mode"][value="time"]');
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-pace]', '5:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-time]')).toContainText('50:00');
});

test('find distance mode: 5:00 pace for 25:00 → 5 km', async ({ page }) => {
  await page.goto(URL);
  await page.click('input[name="mode"][value="distance"]');
  await page.fill('[data-input-pace]', '5:00');
  await page.fill('[data-input-time]', '25:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-distance]')).toContainText('5');
});

test('pace per mile shown in results', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-pace-mile]')).not.toHaveText('—');
  await expect(page.locator('[data-line-pace-mile]')).toContainText('/mi');
});

test('speed in mph shown in results', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-speed-mph]')).not.toHaveText('—');
});

test('race predictions table has 4 rows', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  const rows = page.locator('[data-predictions-body] tr');
  await expect(rows).toHaveCount(4);
});

test('5:00 /km pace → 5K prediction is 25:00', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '5');
  await page.fill('[data-input-time]', '25:00');
  await page.click('[data-calculate]');
  const firstRow = page.locator('[data-predictions-body] tr').first();
  await expect(firstRow).toContainText('25:00');
});

test('show workings panel is populated', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  await page.locator('details.prove-it summary').click();
  await expect(page.locator('[data-prove-it-body]')).not.toBeEmpty();
});

test('fires calculator_result event', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Running Pace Calculator');
  expect(typeof evt.pace_secs_per_km).toBe('number');
  expect(typeof evt.distance_km).toBe('number');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Running Pace');
});

test('has FAQPage JSON-LD with at least 3 questions', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
});

test('primary nav includes Health link', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/health/"]')).toBeVisible();
});

test('health hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/health/');
  await expect(page.locator('.category-grid')).toContainText('Running Pace');
});

// --- Race conditions & training (advanced) ---

test('advanced section is open by default', async ({ page }) => {
  await page.goto(URL);
  const adv = page.locator('[data-advanced]');
  await expect(adv).toBeVisible();
  // <details open> means runners see the new inputs without having to click
  expect(await adv.evaluate(el => el.open)).toBe(true);
});

test('all five new inputs are visible on first load', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-input-race-size]')).toBeVisible();
  await expect(page.locator('[data-input-sex]')).toBeVisible();
  await expect(page.locator('[data-input-mileage]')).toBeVisible();
  await expect(page.locator('[data-input-training-temp]')).toBeVisible();
  await expect(page.locator('[data-input-race-temp]')).toBeVisible();
});

test('default advanced inputs + calculate produces same basic pace as before', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-pace]')).toContainText('5:00');
});

test('breakdown table is visible after calculate', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '21.0975');
  await page.fill('[data-input-time]', '1:30:00');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-adjusted-prediction]')).toBeVisible();
  await expect(page.locator('[data-result-breakdown]')).toBeVisible();
  const rows = page.locator('[data-breakdown-body] tr');
  await expect(rows).toHaveCount(4);
});

test('heat differential of 10°C clearly increases predicted time', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  // Cool first
  await page.selectOption('[data-input-target-race]', '10');
  await page.fill('[data-input-training-temp]', '15');
  await page.fill('[data-input-race-temp]', '15');
  await page.click('[data-calculate]');
  const cool = await page.locator('[data-line-adjusted]').textContent();
  // Hot
  await page.fill('[data-input-race-temp]', '25');
  await page.click('[data-calculate]');
  const hot = await page.locator('[data-line-adjusted]').textContent();
  // Both formatted as M:SS or H:MM:SS — we just need hot > cool in seconds.
  function toSecs(s) {
    const parts = s.trim().split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return NaN;
  }
  expect(toSecs(hot)).toBeGreaterThan(toSecs(cool) + 300);
});

test('calculator_result event still fires with expected calculator_name', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-input-distance]', '10');
  await page.fill('[data-input-time]', '50:00');
  await page.click('[data-calculate]');
  const evt = await page.evaluate(() => window.dataLayer.find(e => e.event === 'calculator_result'));
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Running Pace Calculator');
});
