'use strict';

const { test, expect } = require('@playwright/test');
const URL = '/calculators/property/uk-rent-vs-buy-calculator/';

test.describe('UK Rent vs Buy Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  test('h1 starts with UK', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /^UK Rent vs Buy Calculator$/ })).toBeVisible();
  });

  test('title starts with UK', async ({ page }) => {
    await expect(page).toHaveTitle(/^UK Rent vs Buy Calculator/);
  });

  test('meta description leads with UK focus', async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toMatch(/^UK/);
  });

  test('html lang stays en-GB', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  });

  test('has en-GB self-reference and x-default hreflang', async ({ page }) => {
    await expect(page.locator('link[rel="alternate"][hreflang="en-GB"]')).toHaveAttribute('href', /uk-rent-vs-buy-calculator/);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', /uk-rent-vs-buy-calculator/);
  });

  test('breadcrumbs Home > Calculators > Property > UK Rent vs Buy', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs ol li');
    await expect(crumbs).toHaveCount(4);
    await expect(crumbs.nth(2)).toContainText('Property');
    await expect(crumbs.nth(3)).toContainText('Rent vs Buy');
  });

  test('breakdown hidden before submit', async ({ page }) => {
    await expect(page.locator('[data-breakdown]')).toBeHidden();
  });

  test('default inputs compute a verdict and totals', async ({ page }) => {
    await page.click('[data-calculate]');
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    await expect(page.locator('[data-line-buying-total]')).toContainText('£');
    await expect(page.locator('[data-line-renting-total]')).toContainText('£');
    await expect(page.locator('[data-verdict]')).toBeVisible();
  });

  test('year-by-year table renders rows for the horizon', async ({ page }) => {
    await page.click('[data-calculate]');
    const rows = page.locator('[data-year-table] tbody tr');
    // default horizon is 10 years
    await expect(rows).toHaveCount(10);
  });

  test('first-time buyer toggle reduces stamp duty on a £300k purchase to £0', async ({ page }) => {
    await page.fill('[data-house-price]', '300000');
    await page.fill('[data-deposit]', '30000');
    await page.selectOption('[data-ftb]', 'yes');
    await page.click('[data-calculate]');
    await expect(page.locator('[data-line-sdlt]')).toContainText('0');
  });

  test('standard buyer on £300k shows £5,000 SDLT', async ({ page }) => {
    await page.fill('[data-house-price]', '300000');
    await page.fill('[data-deposit]', '30000');
    await page.selectOption('[data-ftb]', 'no');
    await page.click('[data-calculate]');
    // 2% of 125k + 5% of 50k = 2,500 + 2,500 = 5,000
    await expect(page.locator('[data-line-sdlt]')).toContainText('5,000');
  });

  test('empty state uses placeholder dashes in result cells', async ({ page }) => {
    const cell = await page.locator('[data-line-buying-total]').textContent();
    expect(cell.trim()).toMatch(/^[—–-]$/);
  });

  test('fires calculator_result event with rent vs buy fields', async ({ page }) => {
    await page.click('[data-calculate]');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(evt).toBeTruthy();
    expect(evt.calculator_name).toBe('UK Rent vs Buy Calculator');
    expect(typeof evt.net_buying_cost).toBe('number');
    expect(typeof evt.net_renting_cost).toBe('number');
    expect(typeof evt.horizon_years).toBe('number');
  });

  test('fires calculator_interaction on input change', async ({ page }) => {
    await page.fill('[data-house-price]', '400000');
    await page.locator('[data-house-price]').blur();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction')
    );
    expect(evt).toBeTruthy();
    expect(evt.calculator_name).toBe('UK Rent vs Buy Calculator');
  });

  test('has SoftwareApplication JSON-LD with en-GB and GB', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const software = blocks.map(b => JSON.parse(b)).find(j => j['@type'] === 'SoftwareApplication');
    expect(software).toBeTruthy();
    expect(software.inLanguage).toBe('en-GB');
    expect(software.countriesSupported).toBe('GB');
    expect(software.offers.priceCurrency).toBe('GBP');
    expect(software.applicationCategory).toBe('FinanceApplication');
  });

  test('has FAQPage JSON-LD with at least 4 questions', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map(b => JSON.parse(b)).find(j => j['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
  });

  test('page mentions stamp duty and notes Scotland/Wales differ', async ({ page }) => {
    const text = (await page.locator('main').textContent() || '').toLowerCase();
    expect(text).toContain('stamp duty');
    expect(text).toContain('scotland');
    expect(text).toContain('wales');
  });

  test('uses UK terminology, not US', async ({ page }) => {
    const text = (await page.locator('main').textContent() || '').toLowerCase();
    expect(text).toContain('solicitor');
    expect(text).toContain('estate agent');
    expect(text).not.toContain('realtor');
  });

  test('contains no em dashes in prose', async ({ page }) => {
    // Em dashes are forbidden in prose. Exclude any result cell placeholders.
    const longForm = await page.locator('.long-form').textContent();
    expect(longForm).not.toContain('—');
  });

  test('does not describe anything as automated', async ({ page }) => {
    const text = (await page.locator('main').textContent() || '').toLowerCase();
    expect(text).not.toContain('automated');
  });

  test('related calculators block links to the expected set', async ({ page }) => {
    const related = page.locator('.related-calculators');
    await expect(related).toBeVisible();
    await expect(related.locator('a[href="/calculators/finance/uk-mortgage-calculator/"]')).toBeVisible();
    await expect(related.locator('a[href="/calculators/finance/uk-stamp-duty-calculator/"]')).toBeVisible();
    await expect(related.locator('a[href="/calculators/property/rental-yield-calculator/"]')).toBeVisible();
    await expect(related.locator('a[href="/calculators/finance/uk-salary-tax-calculator/"]')).toBeVisible();
  });

  test('primary nav exposes Property category', async ({ page }) => {
    await page.click('[data-menu-toggle]');
    await expect(page.locator('.primary-nav__submenu a[href="/calculators/property/"]')).toBeVisible();
  });
});

test.describe('Property hub integration', () => {
  test('property hub lists the UK Rent vs Buy Calculator', async ({ page }) => {
    await page.goto('/calculators/property/');
    await expect(page.locator('.category-grid')).toContainText('UK Rent vs Buy');
    await expect(page.locator('.category-grid a[href="/calculators/property/uk-rent-vs-buy-calculator/"]')).toBeVisible();
  });
});
