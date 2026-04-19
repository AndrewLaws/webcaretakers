const { test, expect } = require('@playwright/test');

// GTM container ID placeholder - replace once container is created
const GTM_ID = 'GTM-PBCD82L6';

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

test.describe('Cookie consent (Consent Mode v2)', () => {
  test('Consent Mode defaults deny analytics, ads, and user-data before GTM fires', async ({ page }) => {
    await page.goto('/');

    // The consent default must be pushed to dataLayer BEFORE GTM's 'gtm.js' start event,
    // so that any configured tags respect the denied state from the first frame.
    const ordering = await page.evaluate(() => {
      const dl = window.dataLayer || [];
      const consentIdx = dl.findIndex((e) => e && e[0] === 'consent' && e[1] === 'default');
      const gtmStartIdx = dl.findIndex((e) => e && e.event === 'gtm.js');
      return { consentIdx, gtmStartIdx, length: dl.length };
    });
    expect(ordering.consentIdx).toBeGreaterThanOrEqual(0);
    expect(ordering.gtmStartIdx).toBeGreaterThanOrEqual(0);
    expect(ordering.consentIdx).toBeLessThan(ordering.gtmStartIdx);

    const consentDefaults = await page.evaluate(() => {
      return window.dataLayer.find((e) => e && e[0] === 'consent' && e[1] === 'default');
    });
    expect(consentDefaults).toBeTruthy();
    expect(consentDefaults[2].analytics_storage).toBe('denied');
    expect(consentDefaults[2].ad_storage).toBe('denied');
    expect(consentDefaults[2].ad_user_data).toBe('denied');
    expect(consentDefaults[2].ad_personalization).toBe('denied');
  });

  test('banner is visible on first visit', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('[data-cookie-banner]');
    await expect(banner).toBeVisible();
  });

  test('banner has Accept and Reject buttons with equal visibility', async ({ page }) => {
    await page.goto('/');
    const accept = page.locator('[data-cookie-accept]');
    const reject = page.locator('[data-cookie-reject]');
    await expect(accept).toBeVisible();
    await expect(reject).toBeVisible();
  });

  test('banner has a privacy policy link', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('[data-cookie-banner] a[href*="privacy"]');
    await expect(link).toHaveCount(1);
  });

  test('clicking Reject hides the banner and records denied choice', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-cookie-reject]').click();
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
    const choice = await page.evaluate(() => localStorage.getItem('cookie-consent'));
    expect(choice).toBe('denied');
  });

  test('clicking Accept hides the banner, records granted, and updates consent', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-cookie-accept]').click();
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
    const choice = await page.evaluate(() => localStorage.getItem('cookie-consent'));
    expect(choice).toBe('granted');
    const updateEvent = await page.evaluate(() => {
      return window.dataLayer.find((e) => e[0] === 'consent' && e[1] === 'update');
    });
    expect(updateEvent).toBeTruthy();
    expect(updateEvent[2].analytics_storage).toBe('granted');
    expect(updateEvent[2].ad_storage).toBe('granted');
  });

  test('banner does not appear on subsequent visits once a choice is made', async ({ page, context }) => {
    await page.goto('/');
    await page.locator('[data-cookie-reject]').click();
    await page.reload();
    await expect(page.locator('[data-cookie-banner]')).toBeHidden();
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
