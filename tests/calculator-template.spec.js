const { test, expect } = require('@playwright/test');

// These tests define the contract for individual calculator pages.
// They will run against a sample calculator once the first one is built.
// For now they target the hub landing page which should include a
// calculator preview/demo area.

test.describe('Calculator interaction and DataLayer events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has a calculator input area', async ({ page }) => {
    const inputs = page.locator('[data-calculator] input, [data-calculator] select');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('has a calculator results area', async ({ page }) => {
    const results = page.locator('[data-calculator-results]');
    await expect(results).toHaveCount(1);
  });

  test('pushes calculator_interaction event to dataLayer on input', async ({ page }) => {
    const input = page.locator('[data-calculator] input').first();
    await input.fill('100');

    const event = await page.evaluate(() => {
      return window.dataLayer.find(e => e.event === 'calculator_interaction');
    });
    expect(event).toBeTruthy();
    expect(event.event).toBe('calculator_interaction');
  });

  test('pushes calculator_result event to dataLayer when result is calculated', async ({ page }) => {
    // Fill all required inputs so the calculation can complete
    const inputs = page.locator('[data-calculator] input');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).fill('100');
    }

    // Trigger calculation (press Enter or click calculate button)
    const calcButton = page.locator('[data-calculator] button[type="submit"], [data-calculator] [data-calculate]');
    if (await calcButton.count() > 0) {
      await calcButton.first().click();
    } else {
      await inputs.first().press('Enter');
    }

    const event = await page.evaluate(() => {
      return window.dataLayer.find(e => e.event === 'calculator_result');
    });
    expect(event).toBeTruthy();
    expect(event.event).toBe('calculator_result');
  });

  test('pushes cta_click event to dataLayer when next-step CTA is clicked', async ({ page }) => {
    const cta = page.locator('[data-cta="next-step"] a, [data-cta="next-step"] button');
    if (await cta.count() > 0) {
      await cta.first().click();

      const event = await page.evaluate(() => {
        return window.dataLayer.find(e => e.event === 'cta_click');
      });
      expect(event).toBeTruthy();
      expect(event.event).toBe('cta_click');
    }
  });
});

test.describe('Calculator SEO requirements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has Open Graph tags', async ({ page }) => {
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveCount(1);
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveCount(1);
  });

  test('has robots meta allowing indexing', async ({ page }) => {
    const robots = page.locator('meta[name="robots"]');
    if (await robots.count() > 0) {
      const content = await robots.getAttribute('content');
      expect(content).not.toContain('noindex');
    }
    // No robots meta is also fine (defaults to index)
  });
});
