'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/health/calorie-calculator/';

test('has correct h1', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toContainText('Calorie Calculator');
});

test('has ELI5 section', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.eli5')).toBeVisible();
});

test('has breadcrumbs: Home > Calculators > Health > Calorie Calculator', async ({ page }) => {
  await page.goto(URL);
  const crumbs = page.locator('.breadcrumbs ol li');
  await expect(crumbs).toHaveCount(4);
  await expect(crumbs.nth(0)).toContainText('Home');
  await expect(crumbs.nth(1)).toContainText('Calculators');
  await expect(crumbs.nth(2)).toContainText('Health');
  await expect(crumbs.nth(3)).toContainText('Calorie');
});

test('breakdown is hidden before submit', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('[data-breakdown]')).toBeHidden();
});

test('calculates BMR for male 30yo 80kg 180cm', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight]', '80');
  await page.fill('[data-height]', '180');
  await page.selectOption('[data-activity]', 'sedentary');
  await page.selectOption('[data-goal]', 'maintain');
  await page.click('[data-calculate]');
  // BMR = 1780
  await expect(page.locator('[data-line-bmr]')).toContainText('1,780');
});

test('TDEE is shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight]', '80');
  await page.fill('[data-height]', '180');
  await page.selectOption('[data-activity]', 'sedentary');
  await page.selectOption('[data-goal]', 'maintain');
  await page.click('[data-calculate]');
  // TDEE = 1780 * 1.2 = 2136
  await expect(page.locator('[data-line-tdee]')).toContainText('2,136');
});

test('daily target is lower for lose goal than maintain', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="female"]');
  await page.fill('[data-age]', '28');
  await page.fill('[data-weight]', '70');
  await page.fill('[data-height]', '165');
  await page.selectOption('[data-activity]', 'lightly_active');

  await page.selectOption('[data-goal]', 'maintain');
  await page.click('[data-calculate]');
  const maintainText = await page.locator('[data-line-target]').innerText();

  await page.selectOption('[data-goal]', 'lose');
  await page.click('[data-calculate]');
  const loseText = await page.locator('[data-line-target]').innerText();

  const parseKcal = s => parseInt(s.replace(/[^0-9]/g, ''), 10);
  expect(parseKcal(loseText)).toBeLessThan(parseKcal(maintainText));
});

test('macros are shown after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight]', '75');
  await page.fill('[data-height]', '170');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-line-protein]')).toContainText('kcal');
  await expect(page.locator('[data-line-carbs]')).toContainText('kcal');
  await expect(page.locator('[data-line-fat]')).toContainText('kcal');
});

test('weeks to goal shown when weight goal entered', async ({ page }) => {
  await page.goto(URL);
  await page.check('input[value="male"]');
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight]', '90');
  await page.fill('[data-height]', '180');
  await page.selectOption('[data-activity]', 'sedentary');
  await page.selectOption('[data-goal]', 'lose');
  await page.fill('[data-goal-weight]', '10');
  await page.click('[data-calculate]');
  await expect(page.locator('[data-weeks-block]')).toBeVisible();
  await expect(page.locator('[data-line-weeks]')).toContainText('weeks');
});

test('weeks block hidden when no weight goal entered', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight]', '75');
  await page.fill('[data-height]', '170');
  await page.selectOption('[data-goal]', 'lose');
  // do not fill goal-weight
  await page.click('[data-calculate]');
  await expect(page.locator('[data-weeks-block]')).toBeHidden();
});

test('breakdown visible after submit', async ({ page }) => {
  await page.goto(URL);
  await page.fill('[data-age]', '30');
  await page.fill('[data-weight]', '75');
  await page.fill('[data-height]', '170');
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
  await page.fill('[data-weight]', '75');
  await page.fill('[data-height]', '170');
  await page.click('[data-calculate]');
  const dlEvents = await page.evaluate(() => window._dlEvents || []);
  const evt = dlEvents.find(e => e.event === 'calculator_result');
  expect(evt).toBeTruthy();
  expect(evt.calculator_name).toBe('Calorie Calculator');
});

test('has SoftwareApplication JSON-LD', async ({ page }) => {
  await page.goto(URL);
  const schemas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(el => JSON.parse(el.textContent))
  );
  const app = schemas.find(s => s['@type'] === 'SoftwareApplication');
  expect(app).toBeTruthy();
  expect(app.name).toContain('Calorie');
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
  await expect(page.locator('.primary-nav__submenu a[href="/calculators/health/"]')).toBeVisible();
});

test('health hub lists this calculator', async ({ page }) => {
  await page.goto('/calculators/health/');
  await expect(page.locator('.category-grid')).toContainText('Calorie');
});
