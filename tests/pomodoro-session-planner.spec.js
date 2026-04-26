const { test, expect } = require('@playwright/test');

test.describe('Pomodoro Session Planner page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/productivity/pomodoro-session-planner/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Pomodoro Session Planner' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > Productivity', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'Productivity', includeHidden: true })).toHaveAttribute('href', '/calculators/productivity/');
  });

  test('default inputs produce a session count and elapsed time', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-line-sessions]')).not.toHaveText('–');
    await expect(page.locator('[data-line-elapsed]')).not.toHaveText('–');
  });

  test('two hours at 25 min sessions gives 5 sessions', async ({ page }) => {
    await page.fill('[data-hours]', '2');
    await page.fill('[data-minutes]', '0');
    await page.locator('[data-calculate]').click();
    // ceil(120/25) = 5
    await expect(page.locator('[data-line-sessions]')).toHaveText('5');
  });

  test('per-day list renders one entry when work fits in one day', async ({ page }) => {
    await page.fill('[data-hours]', '2');
    await page.locator('[data-calculate]').click();
    const items = page.locator('[data-days-list] li');
    await expect(items).toHaveCount(1);
  });

  test('per-day list splits when total exceeds the daily cap', async ({ page }) => {
    await page.fill('[data-hours]', '10');
    await page.fill('[data-pomo-cap], [data-daily-cap]', '5').catch(() => {});
    // Use the data-daily-cap selector directly
    await page.fill('[data-daily-cap]', '5');
    await page.locator('[data-calculate]').click();
    const count = await page.locator('[data-days-list] li').count();
    expect(count).toBeGreaterThan(1);
  });

  test('start time produces a finish-time block', async ({ page }) => {
    await page.fill('[data-start-time]', '09:00');
    await page.fill('[data-hours]', '1');
    await page.fill('[data-minutes]', '0');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-finish-block]')).toBeVisible();
    const finish = await page.locator('[data-line-finish]').textContent();
    expect(finish).toMatch(/^\d{2}:\d{2}$/);
  });

  test('realism panel shows a message after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const text = await page.locator('[data-realism-text]').textContent();
    expect(text && text.length).toBeGreaterThan(10);
  });

  test('Prove-it panel populates after calculating', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const body = page.locator('[data-prove-it-body]');
    await expect(body).not.toBeEmpty();
  });

  test('pushes calculator_result event to dataLayer', async ({ page }) => {
    await page.fill('[data-start-time]', '09:00');
    await page.locator('[data-calculate]').click();
    const event = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result')
    );
    expect(event).toBeTruthy();
    expect(event.calculator_name).toBe('Pomodoro Session Planner');
    expect(typeof event.total_focus_minutes).toBe('number');
    expect(event.has_start_time).toBe(true);
  });

  test('has SoftwareApplication and FAQPage JSON-LD with GBP offer', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map(b => JSON.parse(b));
    const types = parsed.map(p => p['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
    const sw = parsed.find(p => p['@type'] === 'SoftwareApplication');
    expect(sw.offers.priceCurrency).toBe('GBP');
    expect(sw.offers.price).toBe('0');
    expect(sw.inLanguage).toBe('en-GB');
  });

  test('FAQ covers the ADHD question honestly', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toContainText(/ADHD/i);
  });

  test('primary nav contains Productivity link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'Productivity', includeHidden: true })).toHaveAttribute('href', '/calculators/productivity/');
  });
});

test.describe('Productivity hub lists the Pomodoro Session Planner', () => {
  test('shows on the Productivity hub', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    await expect(page.getByRole('link', { name: 'Pomodoro Session Planner', includeHidden: true }).first()).toBeVisible();
  });

  test('hub ItemList JSON-LD includes the planner', async ({ page }) => {
    await page.goto('/calculators/productivity/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const found = blocks.some(b => {
      try {
        const parsed = JSON.parse(b);
        const items = parsed.mainEntity && parsed.mainEntity.itemListElement;
        if (!items) return false;
        return items.some(it => it.name === 'Pomodoro Session Planner');
      } catch (e) { return false; }
    });
    expect(found).toBe(true);
  });

  test('all-calculators index hasPart includes the planner', async ({ page }) => {
    await page.goto('/calculators/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const found = blocks.some(b => {
      try {
        const parsed = JSON.parse(b);
        const has = parsed.hasPart || [];
        return has.some(it => it.name === 'Pomodoro Session Planner');
      } catch (e) { return false; }
    });
    expect(found).toBe(true);
  });

  test('all-calculators visible Productivity section lists the planner', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'Pomodoro Session Planner', includeHidden: true }).first()).toBeVisible();
  });
});
