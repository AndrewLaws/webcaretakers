'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/health/tdee-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('TDEE Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('breadcrumbs: Home > Calculators > Health > TDEE Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Health');
  await expect(crumbs.nth(3)).toContainText('TDEE');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('Mifflin-St Jeor BMR for male 30y 80kg 180cm = 1780', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'mifflin');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bmr]')).toContainText('1,780');
});

test('sedentary TDEE for male 30y 80kg 180cm = 2136', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'mifflin');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-tdee]')).toContainText('2,136');
});

test('Mifflin-St Jeor BMR for female 30y 80kg 180cm = 1614', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="female"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'mifflin');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bmr]')).toContainText('1,614');
});

test('Harris-Benedict BMR for male 30y 80kg 180cm approx 1854', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'harris');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bmr]')).toContainText('1,854');
});

test('Katch-McArdle BMR for 80kg 20% body fat = 1752', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-formula]', 'katch');
  await page.fill('[data-bodyfat]', '20');
  await page.selectOption('[data-activity]', '1.2');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bmr]')).toContainText('1,752');
});

test('body fat field is visible when Katch-McArdle selected', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-formula]', 'katch');
  await expect(page.locator('[data-bodyfat-row]')).toBeVisible();
});

test('body fat field is hidden when Mifflin-St Jeor selected', async ({ page }) => {
  await page.goto(URL);
  await page.selectOption('[data-formula]', 'mifflin');
  await expect(page.locator('[data-bodyfat-row]')).toBeHidden();
});

test('activity multiplier changes TDEE', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');

  await page.selectOption('[data-activity]', '1.2');
  await page.click('[data-calculate]');
  const sedText = await page.locator('[data-line-tdee]').innerText();

  await page.selectOption('[data-activity]', '1.725');
  await page.click('[data-calculate]');
  const hvyText = await page.locator('[data-line-tdee]').innerText();

  const n = s => parseInt(s.replace(/[^0-9]/g, ''), 10);
  expect(n(hvyText)).toBeGreaterThan(n(sedText));
});

test('shows calorie target table (maintenance, cut, bulk)', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-maintain]')).toContainText('kcal');
  await expect(page.locator('[data-line-mild-cut]')).toContainText('kcal');
  await expect(page.locator('[data-line-cut]')).toContainText('kcal');
  await expect(page.locator('[data-line-aggressive-cut]')).toContainText('kcal');
  await expect(page.locator('[data-line-mild-bulk]')).toContainText('kcal');
  await expect(page.locator('[data-line-bulk]')).toContainText('kcal');
});

test('cut target equals TDEE minus 500', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'mifflin');
  await page.click('[data-calculate]');
  // TDEE = 2136, cut = 1636
  await expect(page.locator('[data-line-cut]')).toContainText('1,636');
});

test('shows macro split at maintenance', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-protein]')).toContainText('g');
  await expect(page.locator('[data-line-fat]')).toContainText('g');
  await expect(page.locator('[data-line-carbs]')).toContainText('g');
});

test('imperial weight (lbs/stone) round-trips to correct kg', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-height-cm]', '180');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'mifflin');
  // Switch weight to imperial
  await page.check('[data-weight-unit][value="imperial"]');
  // 176.37 lbs ~= 80 kg. Use stone+lbs: 12 st 8 lbs = 176 lbs ~= 79.83 kg -> BMR ~= 1779
  await page.fill('[data-weight-st]', '12');
  await page.fill('[data-weight-lbs]', '8');
  await page.click('[data-calculate]');
  // Expect BMR near 1,779
  await expect(page.locator('[data-line-bmr]')).toContainText(/1,77[0-9]/);
});

test('imperial height (ft+in) round-trips', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.selectOption('[data-activity]', '1.2');
  await page.selectOption('[data-formula]', 'mifflin');
  await page.check('[data-height-unit][value="imperial"]');
  // 5 ft 11 in = 180.34 cm -> BMR ~= 1782
  await page.fill('[data-height-ft]', '5');
  await page.fill('[data-height-in]', '11');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-bmr]')).toContainText(/1,78[0-9]/);
});

test('breakdown visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-breakdown]')).toBeVisible();
});

test('fires calculator_result dataLayer event', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window._dlEvents = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return orig(obj); };
  });
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight-kg]', '80');
  await page.fill('[data-height-cm]', '180');
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('TDEE Calculator');
});

test('fires calculator_interaction dataLayer event on input change', async ({ page }) => {
  await page.goto(URL);
  await page.evaluate(() => {
    window._dlEvents = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (obj) { window._dlEvents.push(obj); return orig(obj); };
  });
  await page.fill('[data-age]', '35');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_interaction');
  expect(evt).toBeTruthy();
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('TDEE');
  expect(app.applicationCategory).toBe('HealthApplication');
});

test('has FAQPage JSON-LD with at least 4 questions', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const faq = schemas.find(s => s['@type'] === 'FAQPage');
  expect(faq).toBeTruthy();
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
});

test('health hub lists TDEE calculator', async ({ page }) => {
  await page.goto('/calculators/health/');
  await expect(page.locator('.category-grid')).toContainText('TDEE');
});

test('primary nav includes Health link', async ({ page }) => {
  await page.goto(URL);
  await page.click('[data-menu-toggle]');
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/health/"]')).toBeVisible();
});

test('no em dashes in body copy', async ({ page }) => {
  await page.goto(URL);
  const text = await page.locator('main').innerText();
  expect(text.includes('\u2014')).toBe(false);
});

test('no use of the word "automated" in body copy', async ({ page }) => {
  await page.goto(URL);
  const text = (await page.locator('main').innerText()).toLowerCase();
  expect(text.includes('automated')).toBe(false);
});

test('related calculators block links to BMI, calorie, pace, pregnancy', async ({ page }) => {
  await page.goto(URL);
  const related = page.locator('.related-calculators');
  await expect(related).toContainText('BMI');
  await expect(related).toContainText('Calorie');
  await expect(related).toContainText('Running Pace');
  await expect(related).toContainText('Pregnancy');
});
