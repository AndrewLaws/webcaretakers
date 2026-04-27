const { test, expect } = require('@playwright/test');

test.describe('AI Image Generation Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/ai/image-generation-cost-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'AI Image Generation Cost Calculator' })).toBeVisible();
  });

  test('has an ELI5 block', async ({ page }) => {
    const eli5 = page.locator('.eli5');
    await expect(eli5).toBeVisible();
    await expect(eli5).toContainText("Explain like I'm 5");
  });

  test('breadcrumb routes through Calculators > AI', async ({ page }) => {
    const crumbs = page.locator('.breadcrumbs');
    await expect(crumbs.getByRole('link', { name: 'Calculators', includeHidden: true })).toHaveAttribute('href', '/calculators/');
    await expect(crumbs.getByRole('link', { name: 'AI', includeHidden: true })).toHaveAttribute('href', '/calculators/ai/');
  });

  test('primary nav contains AI link', async ({ page }) => {
    const nav = page.locator('.primary-nav');
    await expect(nav.getByRole('link', { name: 'AI', includeHidden: true })).toHaveAttribute('href', '/calculators/ai/');
  });

  test('primary model dropdown lists at least four image models', async ({ page }) => {
    const options = await page.locator('[data-primary-model] option').count();
    expect(options).toBeGreaterThanOrEqual(4);
  });

  test('Last verified caption shows an ISO date', async ({ page }) => {
    await page.fill('[data-images-per-month]', '1000');
    await page.locator('[data-calculate]').click();
    const txt = await page.locator('[data-last-verified]').textContent();
    expect(txt.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('submitting renders the breakdown and per-image cost', async ({ page }) => {
    await page.fill('[data-images-per-month]', '1000');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const perImage = await page.locator('[data-line-per-image]').textContent();
    expect(perImage).toMatch(/^\$/);
  });

  test('comparison table renders one row per model, sorted cheapest first', async ({ page }) => {
    await page.fill('[data-images-per-month]', '1000');
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-comparison-body] tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(4);
    // Read the "Monthly" column from each row (2nd td after the row header) and confirm ascending order.
    const monthlies = [];
    for (let i = 0; i < count; i++) {
      const cellText = await rows.nth(i).locator('td').nth(1).textContent();
      monthlies.push(parseFloat(cellText.replace(/[^0-9.\-]/g, '')));
    }
    for (let i = 1; i < monthlies.length; i++) {
      expect(monthlies[i]).toBeGreaterThanOrEqual(monthlies[i - 1]);
    }
  });

  test('monthly cost scales with volume', async ({ page }) => {
    await page.selectOption('[data-primary-model]', 'dalle-3-standard');
    await page.fill('[data-images-per-month]', '1000');
    await page.locator('[data-calculate]').click();
    // 1000 images × $0.040 = $40
    const monthly = await page.locator('[data-line-monthly]').textContent();
    expect(monthly.replace(/[^0-9.]/g, '')).toBe('40.00');
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-images-per-month]', '500');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'AI Image Generation Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with cost fields', async ({ page }) => {
    await page.fill('[data-images-per-month]', '1000');
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'AI Image Generation Cost Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.per_image_cost).toBe('number');
    expect(typeof evt.monthly_cost).toBe('number');
    expect(typeof evt.annual_cost).toBe('number');
    expect(typeof evt.primary_model).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and includes offers', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('AI Image Generation Cost Calculator');
    expect(sa.offers).toBeTruthy();
  });

  test('window.AIImageGenerationCost exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.AIImageGenerationCost;
      return {
        hasProject: typeof lib.projectUsage === 'function',
        hasCostForBatch: typeof lib.costForBatch === 'function',
        hasModelComparison: typeof lib.modelComparison === 'function',
        modelCount: lib.MODELS.length,
      };
    });
    expect(exposed.hasProject).toBe(true);
    expect(exposed.hasCostForBatch).toBe(true);
    expect(exposed.hasModelComparison).toBe(true);
    expect(exposed.modelCount).toBeGreaterThanOrEqual(4);
  });

  test('FAQ contains the Midjourney subscription question', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toContainText('subscription');
  });

  test('Prove it block reveals the workings', async ({ page }) => {
    await page.fill('[data-images-per-month]', '1000');
    await page.locator('[data-calculate]').click();
    const prove = page.locator('[data-prove-it]');
    await expect(prove).toBeVisible();
    await prove.locator('summary').click();
    await expect(page.locator('[data-prove-it-body]')).toContainText('per-image price');
  });
});

test.describe('AI Image Generation Cost Calculator hub registration', () => {
  test('AI hub lists the AI Image Generation Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.getByRole('link', { name: 'AI Image Generation Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('AI hub ItemList JSON-LD includes the new calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    const urls = parsed.mainEntity.itemListElement.map(it => it.url);
    expect(urls).toContain('https://webcaretakers.com/calculators/ai/image-generation-cost-calculator/');
  });

  test('All-calculators hub lists the AI Image Generation Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'AI Image Generation Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
