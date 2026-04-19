const { test, expect } = require('@playwright/test');

// GTM container ID placeholder - replace once container is created
const GTM_ID = 'GTM-XXXXXXX';

test.describe('Base template structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct lang attribute set to en-GB', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('en-GB');
  });

  test('has charset meta tag', async ({ page }) => {
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveAttribute('charset', 'UTF-8');
  });

  test('has viewport meta tag for mobile-first', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('has a title tag', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('has meta description', async ({ page }) => {
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content', /.+/);
  });

  test('has canonical link', async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.+/);
  });
});

test.describe('GTM integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has GTM script snippet in head', async ({ page }) => {
    const gtmScript = await page.evaluate((id) => {
      const scripts = document.querySelectorAll('script');
      return Array.from(scripts).some(s =>
        s.textContent.includes('googletagmanager.com') &&
        s.textContent.includes(id)
      );
    }, GTM_ID);
    expect(gtmScript).toBe(true);
  });

  test('has GTM noscript fallback in body', async ({ page }) => {
    const html = await page.content();
    expect(html).toContain(`googletagmanager.com/ns.html?id=${GTM_ID}`);
    expect(html).toContain('<noscript>');
  });

  test('has dataLayer initialised before GTM script', async ({ page }) => {
    const hasDataLayer = await page.evaluate(() => {
      return Array.isArray(window.dataLayer);
    });
    expect(hasDataLayer).toBe(true);
  });
});

test.describe('Ad placement slots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has header ad slot', async ({ page }) => {
    const slot = page.locator('[data-ad-slot="header"]');
    await expect(slot).toHaveCount(1);
  });

  test('has sidebar ad slot', async ({ page }) => {
    const slot = page.locator('[data-ad-slot="sidebar"]');
    await expect(slot).toHaveCount(1);
  });

  test('has in-content ad slot', async ({ page }) => {
    const slot = page.locator('[data-ad-slot="in-content"]');
    await expect(slot).toHaveCount(1);
  });

  test('has below-results ad slot', async ({ page }) => {
    const slot = page.locator('[data-ad-slot="below-results"]');
    await expect(slot).toHaveCount(1);
  });
});

test.describe('CTA area', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has a next-step CTA container', async ({ page }) => {
    const cta = page.locator('[data-cta="next-step"]');
    await expect(cta).toHaveCount(1);
  });
});

test.describe('Accessibility and SEO basics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has a single h1 element', async ({ page }) => {
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('has a skip-to-content link for accessibility', async ({ page }) => {
    const skip = page.locator('a[href="#main-content"]');
    await expect(skip).toHaveCount(1);
  });

  test('has a main content area with id', async ({ page }) => {
    const main = page.locator('#main-content');
    await expect(main).toHaveCount(1);
  });

  test('has structured data (JSON-LD)', async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Site disclaimer in footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has a disclaimer block inside the footer', async ({ page }) => {
    const disclaimer = page.locator('footer [data-disclaimer]');
    await expect(disclaimer).toHaveCount(1);
  });

  test('disclaimer states results are informational, not professional advice', async ({ page }) => {
    const text = await page.locator('[data-disclaimer]').innerText();
    expect(text.toLowerCase()).toMatch(/informational|information only|general information/);
    expect(text.toLowerCase()).toMatch(/not.*(professional|legal|financial|medical).*advice/);
  });

  test('disclaimer limits liability for decisions based on results', async ({ page }) => {
    const text = await page.locator('[data-disclaimer]').innerText();
    expect(text.toLowerCase()).toMatch(/no liability|not liable|no responsibility|not responsible/);
  });

  test('disclaimer recommends consulting a qualified professional', async ({ page }) => {
    const text = await page.locator('[data-disclaimer]').innerText();
    expect(text.toLowerCase()).toMatch(/qualified|professional|specialist/);
  });

  test('disclaimer discloses affiliate links', async ({ page }) => {
    const text = await page.locator('[data-disclaimer]').innerText();
    expect(text.toLowerCase()).toMatch(/affiliate|commission|earn/);
  });

  test('disclaimer is visible on the page (not hidden)', async ({ page }) => {
    const disclaimer = page.locator('[data-disclaimer]');
    await expect(disclaimer).toBeVisible();
  });
});

test.describe('Responsive layout', () => {
  test('renders correctly at mobile width (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // No horizontal overflow on mobile
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('renders correctly at desktop width (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
