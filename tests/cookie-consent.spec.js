'use strict';

const { test, expect } = require('@playwright/test');

const PAGE = '/';

async function gotoFreshConsent(page, url) {
  // Visit once so we have an origin to set storage on, then clear and reload.
  await page.goto(url);
  await page.evaluate(() => { try { localStorage.removeItem('cookie-consent'); } catch (e) {} });
  await page.reload();
}

test.describe('Cookie consent banner', () => {
  test('shows on first visit when no choice is stored', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });

  test('Accept records granted and hides the banner', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    await page.click('[data-cookie-accept]');
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
    const stored = await page.evaluate(() => localStorage.getItem('cookie-consent'));
    expect(stored).toBe('granted');
  });

  test('Reject records denied and hides the banner', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    await page.click('[data-cookie-reject]');
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
    const stored = await page.evaluate(() => localStorage.getItem('cookie-consent'));
    expect(stored).toBe('denied');
  });

  test('ESC dismisses the banner and records denied', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
    const stored = await page.evaluate(() => localStorage.getItem('cookie-consent'));
    expect(stored).toBe('denied');
  });

  test('focus moves into the banner when shown', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    // Either reject or accept should be focused; reject first is the safer default.
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? (el.getAttribute('data-cookie-reject') !== null ? 'reject'
                : el.getAttribute('data-cookie-accept') !== null ? 'accept'
                : el.tagName) : null;
    });
    expect(['reject', 'accept']).toContain(focusedTag);
  });

  test('Tab is trapped inside the banner while it is open', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    // Tab three times — focus should still be inside the banner.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      var banner = document.querySelector('[data-cookie-banner]');
      return !!(banner && banner.contains(document.activeElement));
    });
    expect(inside).toBe(true);
  });

  test('"Manage cookie preferences" footer link reopens the banner after a choice', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    await page.click('[data-cookie-reject]');
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
    await page.click('[data-cookie-manage]');
    await expect(page.locator('[data-cookie-banner]')).toBeVisible();
  });

  test('the manage-preferences control appears in the site footer', async ({ page }) => {
    await page.goto(PAGE);
    const link = page.locator('footer [data-cookie-manage]');
    await expect(link).toHaveCount(1);
    await expect(link).toContainText(/cookie/i);
  });

  test('stored choice persists across reloads (no banner on return visit)', async ({ page }) => {
    await gotoFreshConsent(page, PAGE);
    await page.click('[data-cookie-accept]');
    await page.reload();
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
  });
});
