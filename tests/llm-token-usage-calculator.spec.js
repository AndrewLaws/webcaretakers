const { test, expect } = require('@playwright/test');

test.describe('LLM Token Usage Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/ai/llm-token-usage-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'LLM Token Usage Calculator' })).toBeVisible();
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

  test('input mode toggles between paste and direct token entry', async ({ page }) => {
    await expect(page.locator('[data-paste-row]')).toBeVisible();
    await expect(page.locator('[data-input-tokens-row]')).toBeHidden();
    await page.selectOption('[data-input-mode]', 'tokens');
    await expect(page.locator('[data-paste-row]')).toBeHidden();
    await expect(page.locator('[data-input-tokens-row]')).toBeVisible();
  });

  test('primary model dropdown lists at least four frontier models', async ({ page }) => {
    const options = await page.locator('[data-primary-model] option').count();
    expect(options).toBeGreaterThanOrEqual(4);
  });

  test('Last verified caption shows an ISO date', async ({ page }) => {
    await page.locator('[data-input-mode]').selectOption('tokens');
    await page.fill('[data-input-tokens]', '500');
    await page.fill('[data-output-tokens]', '500');
    await page.fill('[data-calls]', '1000');
    await page.locator('[data-calculate]').click();
    const txt = await page.locator('[data-last-verified]').textContent();
    expect(txt.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('submitting renders the breakdown and per-call cost', async ({ page }) => {
    await page.locator('[data-input-mode]').selectOption('tokens');
    await page.fill('[data-input-tokens]', '1000');
    await page.fill('[data-output-tokens]', '500');
    await page.fill('[data-calls]', '100');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const perCall = await page.locator('[data-line-per-call]').textContent();
    expect(perCall).toMatch(/^\$/);
  });

  test('comparison table renders one row per model, sorted cheapest first', async ({ page }) => {
    await page.locator('[data-input-mode]').selectOption('tokens');
    await page.fill('[data-input-tokens]', '1000');
    await page.fill('[data-output-tokens]', '500');
    await page.fill('[data-calls]', '100');
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-comparison-body] tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(4);
    // Read the "Monthly" column from each row and confirm ascending order.
    const monthlies = [];
    for (let i = 0; i < count; i++) {
      const cellText = await rows.nth(i).locator('td').nth(3).textContent();
      monthlies.push(parseFloat(cellText.replace(/[^0-9.\-]/g, '')));
    }
    for (let i = 1; i < monthlies.length; i++) {
      expect(monthlies[i]).toBeGreaterThanOrEqual(monthlies[i - 1]);
    }
  });

  test('paste mode estimates tokens from text length', async ({ page }) => {
    // 400 characters of A → ~100 tokens (4-char rule)
    const text = 'A'.repeat(400);
    await page.fill('[data-input-text]', text);
    await page.fill('[data-output-tokens]', '0');
    await page.fill('[data-calls]', '1');
    await page.locator('[data-calculate]').click();
    const inputTokensText = await page.locator('[data-line-input-tokens]').textContent();
    expect(inputTokensText).toContain('100');
    expect(inputTokensText.toLowerCase()).toContain('approx');
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-output-tokens]', '750');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'LLM Token Usage Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with cost fields', async ({ page }) => {
    await page.locator('[data-input-mode]').selectOption('tokens');
    await page.fill('[data-input-tokens]', '1000');
    await page.fill('[data-output-tokens]', '500');
    await page.fill('[data-calls]', '100');
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'LLM Token Usage Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.per_call_cost).toBe('number');
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

  test('SoftwareApplication JSON-LD names the calculator', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('LLM Token Usage Calculator');
    expect(sa.offers).toBeTruthy();
  });

  test('window.LLMTokenUsage exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.LLMTokenUsage;
      return {
        hasEstimate: typeof lib.estimateTokens === 'function',
        hasCostForRun: typeof lib.costForRun === 'function',
        hasModelComparison: typeof lib.modelComparison === 'function',
        modelCount: lib.MODELS.length,
      };
    });
    expect(exposed.hasEstimate).toBe(true);
    expect(exposed.hasCostForRun).toBe(true);
    expect(exposed.hasModelComparison).toBe(true);
    expect(exposed.modelCount).toBeGreaterThanOrEqual(4);
  });

  test('FAQ contains the "what is a token" question', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toContainText('What is a token?');
  });
});

test.describe('AI hub registration', () => {
  test('AI hub lists the LLM Token Usage Calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.getByRole('link', { name: 'LLM Token Usage Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('AI hub has CollectionPage JSON-LD with ItemList', async ({ page }) => {
    await page.goto('/calculators/ai/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('CollectionPage');
    expect(parsed.mainEntity['@type']).toBe('ItemList');
    expect(parsed.mainEntity.itemListElement.length).toBeGreaterThanOrEqual(1);
  });

  test('All-calculators hub lists the LLM Token Usage Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'LLM Token Usage Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
