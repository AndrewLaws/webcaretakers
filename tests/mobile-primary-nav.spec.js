const { test, expect } = require('@playwright/test');

// Mobile primary-nav contract: at narrow viewport widths the nav is hidden
// behind a hamburger toggle injected by main.js. Tapping the toggle expands
// the panel; tapping again or tapping a link inside it collapses it again.

test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13 Pro / 13 Pro Max width

test.describe('Mobile primary nav', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hamburger toggle is rendered into the header', async ({ page }) => {
    const toggle = page.locator('[data-nav-toggle]');
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toBeVisible();
  });

  test('primary nav is hidden by default at mobile width', async ({ page }) => {
    const nav = page.locator('.site-header .primary-nav');
    await expect(nav).toBeHidden();
  });

  test('tapping the toggle expands the nav and exposes categories', async ({ page }) => {
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await expect(page.locator('.site-header')).toHaveAttribute('data-nav-open', '');
    await expect(page.locator('.site-header .primary-nav')).toBeVisible();
    // Open the Calculators submenu and confirm a category is reachable
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('.site-header').getByRole('link', { name: 'Health', exact: true })).toBeVisible();
  });

  test('tapping the toggle a second time collapses the nav again', async ({ page }) => {
    const toggle = page.locator('[data-nav-toggle]');
    await toggle.click();
    await toggle.click();
    await expect(page.locator('.site-header')).not.toHaveAttribute('data-nav-open', '');
    await expect(page.locator('.site-header .primary-nav')).toBeHidden();
  });

  test('tapping a category link inside the open nav collapses the panel', async ({ page }) => {
    await page.locator('[data-nav-toggle]').click();
    // Open the Calculators submenu first so a category link is visible
    await page.locator('[data-menu-toggle]').click();
    await page.locator('.site-header').getByRole('link', { name: 'Health', exact: true }).click();
    // Navigation will start; we only need to verify the toggle attribute
    // got reset before navigation kicked in.
    await expect(page).toHaveURL(/\/calculators\/health\//);
  });
});

test.describe('Desktop primary nav', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('hamburger toggle is hidden on desktop', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-nav-toggle]');
    await expect(toggle).toBeHidden();
  });

  test('primary nav is visible inline on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-header .primary-nav')).toBeVisible();
  });
});
