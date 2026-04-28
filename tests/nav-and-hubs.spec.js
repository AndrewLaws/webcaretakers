const { test, expect } = require('@playwright/test');

test.describe('Primary nav', () => {
  const pages = [
    '/',
    '/about/',
    '/privacy/',
    '/terms/',
    '/contact/',
    '/calculators/',
    '/calculators/broadband/',
    '/calculators/broadband/broadband-bandwidth-calculator/'
  ];

  for (const url of pages) {
    test(`renders primary nav on ${url}`, async ({ page }) => {
      await page.goto(url);
      const nav = page.locator('nav[aria-label="Main navigation"].primary-nav');
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('button', { name: /Calculators/ })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'About' })).toBeVisible();
    });
  }

  test('Calculators dropdown toggles on click and lists the Broadband category', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-menu-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const submenu = page.locator('.primary-nav__submenu');
    await expect(submenu.getByRole('link', { name: 'Broadband' })).toBeVisible();
    await expect(submenu.getByRole('link', { name: 'See all calculators' })).toBeVisible();
  });

  test('Escape closes the open submenu', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-menu-toggle]');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Homepage "New this week" section', () => {
  test('renders four cards with links to calculator pages', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('[data-newest-calculators]');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2, name: 'New this week' })).toBeVisible();
    const cards = section.locator('.category-card');
    await expect(cards).toHaveCount(4);
    const links = await section.locator('.category-card h3 a').evaluateAll(
      (els) => els.map((a) => a.getAttribute('href'))
    );
    for (const href of links) {
      expect(href).toMatch(/^\/calculators\/[a-z]+\/[a-z0-9-]+\/$/);
    }
  });
});

test.describe('All-calculators hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/');
  });

  test('has an h1 and breadcrumb', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'All calculators' })).toBeVisible();
    await expect(page.locator('.breadcrumbs')).toContainText('All calculators');
  });

  test('links to the Broadband Bandwidth Calculator', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Broadband Bandwidth Calculator' });
    await expect(link).toHaveAttribute('href', '/calculators/broadband/broadband-bandwidth-calculator/');
  });

  test('has CollectionPage JSON-LD', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('CollectionPage');
  });
});

test.describe('Broadband category hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/broadband/');
  });

  test('has an h1 and breadcrumb through /calculators/', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Broadband calculators' })).toBeVisible();
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators' })).toHaveAttribute('href', '/calculators/');
  });

  test('lists the Broadband Bandwidth Calculator with a description', async ({ page }) => {
    const card = page.locator('.category-card').first();
    await expect(card.getByRole('link', { name: 'Broadband Bandwidth Calculator' })).toBeVisible();
    await expect(card).toContainText('download and upload speeds');
  });

  test('has ItemList JSON-LD', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('CollectionPage');
    expect(parsed.mainEntity['@type']).toBe('ItemList');
    expect(parsed.mainEntity.itemListElement.length).toBeGreaterThanOrEqual(1);
  });
});
