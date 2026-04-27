'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/cybersecurity/data-breach-risk-score/';

// Worst-case answers across the form. Used in multiple tests, so kept as a
// helper. Field IDs match the form and the scorer in the page JS.
async function fillWorstCase(page) {
  await page.selectOption('[data-field="accounts"]', 'over200');
  await page.selectOption('[data-field="reuse"]', 'most');
  await page.selectOption('[data-field="manager"]', 'no');
  await page.selectOption('[data-field="twofa"]', 'none');
  await page.selectOption('[data-field="aliases"]', 'no');
  await page.selectOption('[data-field="updates"]', 'rarely');
  await page.selectOption('[data-field="wifi"]', 'often');
  await page.selectOption('[data-field="phish1"]', 'wrong');
  await page.selectOption('[data-field="phish2"]', 'wrong');
  await page.selectOption('[data-field="phish3"]', 'wrong');
  await page.selectOption('[data-field="hibp"]', 'never');
  await page.selectOption('[data-field="cascade"]', 'high');
}

async function fillBestCase(page) {
  await page.selectOption('[data-field="accounts"]', 'under50');
  await page.selectOption('[data-field="reuse"]', 'never');
  await page.selectOption('[data-field="manager"]', 'yes');
  await page.selectOption('[data-field="twofa"]', 'all');
  await page.selectOption('[data-field="aliases"]', 'yes');
  await page.selectOption('[data-field="updates"]', 'auto');
  await page.selectOption('[data-field="wifi"]', 'never');
  await page.selectOption('[data-field="phish1"]', 'right');
  await page.selectOption('[data-field="phish2"]', 'right');
  await page.selectOption('[data-field="phish3"]', 'right');
  await page.selectOption('[data-field="hibp"]', 'recent');
  await page.selectOption('[data-field="cascade"]', 'low');
}

test.describe('Data Breach Risk Score page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  test('has expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Data Breach Risk Score' })).toBeVisible();
  });

  test('breadcrumbs Home > Calculators > Cybersecurity > Data Breach Risk Score', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs ol li');
    await expect(crumbs).toHaveCount(4);
    await expect(crumbs.nth(0)).toContainText('Home');
    await expect(crumbs.nth(1)).toContainText('Calculators');
    await expect(crumbs.nth(2)).toContainText('Cybersecurity');
    await expect(crumbs.nth(3)).toContainText('Data Breach Risk Score');
  });

  test('primary nav contains Cybersecurity link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Cybersecurity', includeHidden: true })).toHaveAttribute('href', '/calculators/cybersecurity/');
  });

  test('reassurance text states answers stay in browser', async ({ page }) => {
    await expect(page.locator('main')).toContainText(/answers don't leave the page|All scoring happens in your browser/i);
  });

  test('worst-case answers produce Critical category', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const cat = await page.locator('[data-result-category]').textContent();
    expect(cat.trim()).toBe('Critical');
    const score = parseInt(await page.locator('[data-result-score]').textContent(), 10);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  test('best-case answers produce Low category', async ({ page }) => {
    await fillBestCase(page);
    await page.locator('[data-calculate]').click();
    const cat = await page.locator('[data-result-category]').textContent();
    expect(cat.trim()).toBe('Low');
    const score = parseInt(await page.locator('[data-result-score]').textContent(), 10);
    expect(score).toBeLessThanOrEqual(20);
  });

  test('recommendations reflect the user answers (password reuse appears in top 3 when reusing)', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const top3 = await page.locator('[data-recommendations] li').evaluateAll(els => els.slice(0, 3).map(e => e.textContent.toLowerCase()));
    const mentionsManager = top3.some(t => t.includes('password manager'));
    expect(mentionsManager).toBe(true);
  });

  test('recommendations are ordered by impact (highest weight first)', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const weights = await page.locator('[data-recommendations] li').evaluateAll(
      els => els.map(e => parseFloat(e.getAttribute('data-impact') || '0'))
    );
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
    }
  });

  test('"if you fix the top 3" recompute is lower than current score', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const score = parseInt(await page.locator('[data-result-score]').textContent(), 10);
    const fixed = parseInt(await page.locator('[data-fixed-score]').textContent(), 10);
    expect(fixed).toBeLessThan(score);
  });

  test('prove-it shows the per-category breakdown table', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const proveIt = page.locator('[data-prove-it]');
    await proveIt.locator('summary').click();
    const rows = proveIt.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(8);
  });

  test('breakdown bar chart renders one bar per category', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const bars = page.locator('[data-breakdown-chart] [data-bar]');
    expect(await bars.count()).toBeGreaterThanOrEqual(8);
  });

  test('Re-take button resets the form', async ({ page }) => {
    await fillBestCase(page);
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-results]')).toBeVisible();
    await page.locator('[data-retake]').click();
    await expect(page.locator('[data-results]')).toBeHidden();
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.selectOption('[data-field="manager"]', 'yes');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'Data Breach Risk Score')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with score and category', async ({ page }) => {
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'Data Breach Risk Score')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.score).toBe('number');
    expect(typeof evt.category).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('the page makes no fetch or XHR calls (browser-only)', async ({ page }) => {
    const requests = [];
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith('http://localhost') || url.startsWith('about:') || url.startsWith('data:')) return;
      // Allow GTM / consent-mode scripts which are part of the base template.
      if (url.includes('googletagmanager.com')) return;
      if (url.includes('google-analytics.com')) return;
      if (url.includes('doubleclick.net')) return;
      requests.push(url);
    });
    await fillWorstCase(page);
    await page.locator('[data-calculate]').click();
    await page.waitForTimeout(200);
    expect(requests).toEqual([]);
  });
});

test.describe('Cybersecurity hub registration', () => {
  test('cybersecurity hub lists the Data Breach Risk Score', async ({ page }) => {
    await page.goto('/calculators/cybersecurity/');
    await expect(page.getByRole('link', { name: 'Data Breach Risk Score', includeHidden: true }).first()).toBeVisible();
  });

  test('all-calculators hub lists the Data Breach Risk Score', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Data Breach Risk Score', includeHidden: true }).first()).toBeVisible();
  });
});
