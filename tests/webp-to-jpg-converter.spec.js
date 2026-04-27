'use strict';

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const URL = '/calculators/images/webp-to-jpg-converter/';

test.describe('WebP to JPG Converter page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'WebP to JPG Converter' })).toBeVisible();
  });

  test('title leads with the tool name', async ({ page }) => {
    await expect(page).toHaveTitle(/^WebP to JPG Converter/);
  });

  test('meta description mentions WebP and JPG', async ({ page }) => {
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toMatch(/WebP/);
    expect(desc).toMatch(/JPG|JPEG/i);
  });

  test('html lang stays en-GB', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  });

  test('has a canonical pointing at the tool', async ({ page }) => {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /webp-to-jpg-converter/);
  });

  test('breadcrumb routes through Calculators > Images', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Images', includeHidden: true })).toHaveAttribute('href', '/calculators/images/');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication declares free offer and en-GB', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(j => j['@type'] === 'SoftwareApplication');
    expect(sa.applicationCategory).toBe('MultimediaApplication');
    expect(sa.operatingSystem).toBe('Any');
    expect(sa.offers.price).toBe('0');
    expect(sa.inLanguage).toBe('en-GB');
  });

  test('dropzone is visible on initial load', async ({ page }) => {
    await expect(page.locator('[data-dropzone]')).toBeVisible();
  });

  test('results list is hidden until a file is processed', async ({ page }) => {
    await expect(page.locator('[data-results]')).toBeHidden();
  });

  test('uses calculator-card class, not data-calculator attribute', async ({ page }) => {
    await expect(page.locator('section.calculator-card')).toHaveCount(1);
    await expect(page.locator('section[data-calculator]')).toHaveCount(0);
  });

  test('file input accepts webp, jpg and png', async ({ page }) => {
    const accept = await page.locator('[data-file]').getAttribute('accept');
    expect(accept).toMatch(/webp/);
    expect(accept).toMatch(/jpeg|jpg/);
    expect(accept).toMatch(/png/);
  });

  test('output format select offers JPG and PNG', async ({ page }) => {
    const opts = await page.locator('[data-format] option').allTextContents();
    const joined = opts.join(' ').toLowerCase();
    expect(joined).toMatch(/jpg|jpeg/);
    expect(joined).toMatch(/png/);
  });

  test('quality slider defaults to 0.92 (92)', async ({ page }) => {
    const v = await page.locator('[data-quality]').getAttribute('value');
    expect(v).toBe('92');
  });

  test('FAQ contains the Chrome WebP question', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toContainText(/Chrome/i);
    await expect(faq).toContainText(/Word|Outlook|PowerPoint/i);
  });

  test('content makes the pain visceral about Outlook/Word/PowerPoint', async ({ page }) => {
    const body = await page.locator('main').textContent();
    expect(body).toMatch(/Outlook|Word|PowerPoint/);
  });

  test('related calculators block links to Photo Resizer and HEIC tool', async ({ page }) => {
    const related = page.locator('.related-calculators');
    await expect(related).toContainText('Photo Resizer');
    const heic = related.locator('a[href*="heic-to-jpg"]');
    await expect(heic).toHaveCount(1);
  });

  test('no em dashes in visible prose', async ({ page }) => {
    const main = await page.locator('main').textContent();
    // The placeholder em dash glyph is allowed inside result UI; the results
    // list is hidden on load, so anything textContent surfaces here is prose.
    expect(main).not.toContain('\u2014');
  });

  test('does not describe itself as automated', async ({ page }) => {
    const main = (await page.locator('main').textContent()).toLowerCase();
    expect(main).not.toContain('automated');
  });
});

test.describe('Images category hub lists the WebP to JPG Converter', () => {
  test('hub page links to the new tool', async ({ page }) => {
    await page.goto('/calculators/images/');
    await expect(page.getByRole('link', { name: 'WebP to JPG Converter', includeHidden: true }).first()).toBeVisible();
  });
});

test.describe('All-calculators hub lists the WebP to JPG Converter', () => {
  test('all-calculators hub links to the new tool', async ({ page }) => {
    await page.goto('/calculators/');
    const link = page.getByRole('link', { name: 'WebP to JPG Converter' });
    await expect(link).toHaveAttribute('href', '/calculators/images/webp-to-jpg-converter/');
  });
});

test.describe('Registration in source-of-truth files', () => {
  test('categories.json contains the webp-to-jpg-converter slug', () => {
    const cats = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'categories.json'), 'utf8'));
    const images = cats.categories.find(c => c.slug === 'images');
    const tool = images.tools.find(t => t.slug === 'webp-to-jpg-converter');
    expect(tool).toBeTruthy();
    expect(tool.name).toBe('WebP to JPG Converter');
  });

  test('links.json contains a phrase pointing at the new tool', () => {
    const links = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'links.json'), 'utf8'));
    const found = links.links.find(l => l.url === '/calculators/images/webp-to-jpg-converter/');
    expect(found).toBeTruthy();
  });
});

test.describe('Animated-WebP detection helper', () => {
  // The page exposes a tiny pure-logic helper on window for unit testing.
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
  });

  test('detects ANIM chunk in a synthetic VP8X header', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Synthetic RIFF/WEBP/VP8X header with the animation flag set.
      const bytes = new Uint8Array(64);
      const enc = new TextEncoder();
      bytes.set(enc.encode('RIFF'), 0);
      bytes.set([0, 0, 0, 0], 4);
      bytes.set(enc.encode('WEBP'), 8);
      bytes.set(enc.encode('VP8X'), 12);
      bytes.set([10, 0, 0, 0], 16); // chunk size
      // Flags byte at offset 20: bit 1 (0x02) is the animation flag.
      bytes[20] = 0x02;
      return window.WebpToJpg.isAnimatedWebp(bytes.buffer);
    });
    expect(result).toBe(true);
  });

  test('returns false for a still WebP header', async ({ page }) => {
    const result = await page.evaluate(() => {
      const bytes = new Uint8Array(64);
      const enc = new TextEncoder();
      bytes.set(enc.encode('RIFF'), 0);
      bytes.set(enc.encode('WEBP'), 8);
      bytes.set(enc.encode('VP8 '), 12);
      return window.WebpToJpg.isAnimatedWebp(bytes.buffer);
    });
    expect(result).toBe(false);
  });

  test('returns false for non-WebP data', async ({ page }) => {
    const result = await page.evaluate(() => {
      const bytes = new Uint8Array(64);
      const enc = new TextEncoder();
      bytes.set(enc.encode('JFIF'), 0);
      return window.WebpToJpg.isAnimatedWebp(bytes.buffer);
    });
    expect(result).toBe(false);
  });
});

// Minimal 1x1 transparent PNG. Used to drive a successful conversion in the
// browser without shipping a real WebP fixture.
const TINY_PNG = Buffer.from(
  '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D' +
  '49444154789C636000010000050001AAB6B0A40000000049454E44AE426082',
  'hex'
);

test.describe('Prove it panel', () => {
  test('button appears after a successful conversion', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    await expect(page.locator('button[data-prove-it]')).toBeVisible({ timeout: 10000 });
  });

  test('clicking the button reveals the body', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    const btn = page.locator('button[data-prove-it]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    const body = page.locator('[data-prove-body]');
    await expect(body).toBeHidden();
    await btn.click();
    await expect(body).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  test('body cites the user file name and a numeric output dimension', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    const btn = page.locator('button[data-prove-it]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    const text = await page.locator('[data-prove-body]').textContent();
    expect(text).toMatch(/pixel\.png/);
    expect(text).toMatch(/1\s*[\u00d7x]\s*1/);
  });

  test('dataLayer captures prove_it action', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-file]').setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: TINY_PNG });
    const btn = page.locator('button[data-prove-it]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    const dl = await page.evaluate(() => window.dataLayer);
    const hit = dl.find(e => e.event === 'calculator_interaction' && e.action === 'prove_it' && e.calculator_name === 'WebP to JPG Converter');
    expect(hit).toBeTruthy();
  });
});
