const { test, expect } = require('@playwright/test');

test.describe('AI vs Human Writer Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/ai/ai-vs-human-writer-cost-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'AI vs Human Writer Cost Calculator' })).toBeVisible();
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

  test('human pricing mode toggles between per-word and per-hour', async ({ page }) => {
    await expect(page.locator('[data-per-word-row]')).toBeVisible();
    await expect(page.locator('[data-per-hour-row]')).toBeHidden();
    await page.selectOption('[data-human-mode]', 'perHour');
    await expect(page.locator('[data-per-word-row]')).toBeHidden();
    await expect(page.locator('[data-per-hour-row]')).toBeVisible();
    await expect(page.locator('[data-words-per-hour-row]')).toBeVisible();
  });

  test('primary model dropdown lists at least four frontier models', async ({ page }) => {
    const options = await page.locator('[data-primary-model] option').count();
    expect(options).toBeGreaterThanOrEqual(4);
  });

  test('Last verified caption shows an ISO date after calculate', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const txt = await page.locator('[data-last-verified]').textContent();
    expect(txt.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('submitting renders the breakdown with LLM and human monthly figures', async ({ page }) => {
    await page.fill('[data-words-per-month]', '50000');
    await page.fill('[data-article-words]', '1000');
    await page.fill('[data-input-tokens]', '800');
    await page.fill('[data-per-word-rate]', '0.15');
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const llm = await page.locator('[data-line-llm]').textContent();
    const human = await page.locator('[data-line-human]').textContent();
    expect(llm).toMatch(/^\$/);
    expect(human).toMatch(/^\$7,500\.00/);
  });

  test('comparison table renders one row per model, sorted cheapest first', async ({ page }) => {
    await page.fill('[data-words-per-month]', '50000');
    await page.fill('[data-article-words]', '1000');
    await page.fill('[data-input-tokens]', '800');
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-comparison-body] tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(4);
    // Read the "Monthly" column (index 4) and confirm ascending order.
    const monthlies = [];
    for (let i = 0; i < count; i++) {
      const cellText = await rows.nth(i).locator('td').nth(3).textContent();
      monthlies.push(parseFloat(cellText.replace(/[^0-9.\-]/g, '')));
    }
    for (let i = 1; i < monthlies.length; i++) {
      expect(monthlies[i]).toBeGreaterThanOrEqual(monthlies[i - 1]);
    }
  });

  test('reports LLM-cheaper verdict at default human rate', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const txt = await page.locator('[data-breakeven]').textContent();
    expect(txt.toLowerCase()).toContain('never cheaper');
  });

  test('per-hour mode produces a sensible human monthly', async ({ page }) => {
    await page.fill('[data-words-per-month]', '50000');
    await page.selectOption('[data-human-mode]', 'perHour');
    await page.fill('[data-hourly-rate]', '50');
    await page.fill('[data-words-per-hour]', '500');
    await page.locator('[data-calculate]').click();
    // 50000 / 500 = 100 hours * $50 = $5,000
    const human = await page.locator('[data-line-human]').textContent();
    expect(human).toMatch(/\$5,000\.00/);
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-words-per-month]', '60000');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'AI vs Human Writer Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with savings_per_month and breakeven_words fields', async ({ page }) => {
    await page.fill('[data-words-per-month]', '50000');
    await page.fill('[data-article-words]', '1000');
    await page.fill('[data-input-tokens]', '800');
    await page.fill('[data-per-word-rate]', '0.15');
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'AI vs Human Writer Cost Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.savings_per_month).toBe('number');
    expect(typeof evt.breakeven_words).toBe('number');
    expect(typeof evt.llm_monthly_cost).toBe('number');
    expect(typeof evt.human_monthly_cost).toBe('number');
    expect(typeof evt.primary_model).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD names the calculator and has an offer', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('AI vs Human Writer Cost Calculator');
    expect(sa.offers).toBeTruthy();
  });

  test('window.AIvsHumanWriterCost exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.AIvsHumanWriterCost;
      return {
        hasWordsToTokens: typeof lib.wordsToTokens === 'function',
        hasLlmMonthly: typeof lib.llmMonthlyCost === 'function',
        hasHumanMonthly: typeof lib.humanMonthlyCost === 'function',
        hasModelComparison: typeof lib.modelComparison === 'function',
        modelCount: lib.MODELS.length,
      };
    });
    expect(exposed.hasWordsToTokens).toBe(true);
    expect(exposed.hasLlmMonthly).toBe(true);
    expect(exposed.hasHumanMonthly).toBe(true);
    expect(exposed.hasModelComparison).toBe(true);
    expect(exposed.modelCount).toBeGreaterThanOrEqual(4);
  });

  test('FAQ contains the editorial trade-off question', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toContainText('comparable to hiring a writer');
  });

  test('long-form covers when humans make sense', async ({ page }) => {
    const longForm = page.locator('.long-form');
    await expect(longForm).toContainText('When humans make sense');
    await expect(longForm).toContainText('When LLMs make sense');
  });
});

test.describe('AI vs Human Writer Cost Calculator hub registration', () => {
  test('AI hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.getByRole('link', { name: 'AI vs Human Writer Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('AI hub ItemList JSON-LD includes the new calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    const parsed = JSON.parse(jsonLd);
    const names = parsed.mainEntity.itemListElement.map(i => i.name);
    expect(names).toContain('AI vs Human Writer Cost Calculator');
  });

  test('All-calculators hub lists the calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'AI vs Human Writer Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
