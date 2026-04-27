const { test, expect } = require('@playwright/test');

test.describe('RAG Pipeline Cost Calculator page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculators/ai/rag-pipeline-cost-calculator/');
  });

  test('has the expected h1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'RAG Pipeline Cost Calculator' })).toBeVisible();
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

  test('embedding model dropdown lists the four required models', async ({ page }) => {
    const values = await page.locator('[data-embedding-model] option').evaluateAll(opts => opts.map(o => o.value));
    expect(values).toEqual(expect.arrayContaining([
      'text-embedding-3-small',
      'text-embedding-3-large',
      'voyage-3',
      'cohere-embed-v3',
    ]));
  });

  test('vector DB dropdown lists the four required tiers', async ({ page }) => {
    const values = await page.locator('[data-vector-db] option').evaluateAll(opts => opts.map(o => o.value));
    expect(values).toEqual(expect.arrayContaining([
      'pinecone-starter',
      'weaviate-cloud',
      'pgvector-self-hosted',
      'qdrant-cloud',
    ]));
  });

  test('LLM dropdown lists at least eight frontier models', async ({ page }) => {
    const count = await page.locator('[data-llm-model] option').count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('Last verified caption shows an ISO date', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const txt = await page.locator('[data-last-verified]').textContent();
    expect(txt.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('submitting renders first-month and ongoing-month totals', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    await expect(page.locator('[data-breakdown]')).toBeVisible();
    const first = await page.locator('[data-line-first-month]').textContent();
    const ongoing = await page.locator('[data-line-ongoing-month]').textContent();
    expect(first).toMatch(/^\$/);
    expect(ongoing).toMatch(/^\$/);
  });

  test('month-by-month table shows row 1 with corpus cost included', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-month-table] tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('LLM swap comparison renders sorted cheapest first', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const rows = page.locator('[data-llm-comparison-body] tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(8);
    const monthlies = [];
    for (let i = 0; i < count; i++) {
      const cellText = await rows.nth(i).locator('td').nth(2).textContent();
      monthlies.push(parseFloat(cellText.replace(/[^0-9.\-]/g, '')));
    }
    for (let i = 1; i < monthlies.length; i++) {
      expect(monthlies[i]).toBeGreaterThanOrEqual(monthlies[i - 1]);
    }
  });

  test('pushes calculator_interaction event on input', async ({ page }) => {
    await page.fill('[data-queries-per-day]', '1234');
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_interaction' && e.calculator_name === 'RAG Pipeline Cost Calculator')
    );
    expect(evt).toBeTruthy();
  });

  test('pushes calculator_result event with cost fields', async ({ page }) => {
    await page.locator('[data-calculate]').click();
    const evt = await page.evaluate(() =>
      window.dataLayer.find(e => e.event === 'calculator_result' && e.calculator_name === 'RAG Pipeline Cost Calculator')
    );
    expect(evt).toBeTruthy();
    expect(typeof evt.first_month_cost).toBe('number');
    expect(typeof evt.ongoing_month_cost).toBe('number');
    expect(typeof evt.llm_model).toBe('string');
  });

  test('has SoftwareApplication and FAQPage JSON-LD', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map(b => JSON.parse(b)['@type']);
    expect(types).toContain('SoftwareApplication');
    expect(types).toContain('FAQPage');
  });

  test('SoftwareApplication JSON-LD has offers', async ({ page }) => {
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const sa = blocks.map(b => JSON.parse(b)).find(b => b['@type'] === 'SoftwareApplication');
    expect(sa).toBeTruthy();
    expect(sa.name).toBe('RAG Pipeline Cost Calculator');
    expect(sa.offers).toBeTruthy();
  });

  test('window.RAGPipelineCost exposes pure-logic helpers', async ({ page }) => {
    const exposed = await page.evaluate(() => {
      const lib = window.RAGPipelineCost;
      return {
        hasEmbedding: typeof lib.embeddingCost === 'function',
        hasProject: typeof lib.projectPipeline === 'function',
        hasComparison: typeof lib.llmComparison === 'function',
        embeddingCount: lib.EMBEDDING_MODELS.length,
        vectorCount: lib.VECTOR_DBS.length,
        llmCount: lib.LLM_MODELS.length,
      };
    });
    expect(exposed.hasEmbedding).toBe(true);
    expect(exposed.hasProject).toBe(true);
    expect(exposed.hasComparison).toBe(true);
    expect(exposed.embeddingCount).toBeGreaterThanOrEqual(4);
    expect(exposed.vectorCount).toBeGreaterThanOrEqual(4);
    expect(exposed.llmCount).toBeGreaterThanOrEqual(8);
  });

  test('FAQ contains a question', async ({ page }) => {
    const faq = page.locator('.faq');
    await expect(faq).toBeVisible();
    const detailsCount = await faq.locator('details').count();
    expect(detailsCount).toBeGreaterThanOrEqual(3);
  });

  test('long-form links to the LLM Token Usage Calculator', async ({ page }) => {
    const link = page.locator('.long-form a[href="/calculators/ai/llm-token-usage-calculator/"]').first();
    await expect(link).toBeVisible();
  });
});

test.describe('AI hub registration for RAG calculator', () => {
  test('AI hub lists the RAG Pipeline Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/ai/');
    await expect(page.getByRole('link', { name: 'RAG Pipeline Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });

  test('All-calculators hub lists the RAG Pipeline Cost Calculator', async ({ page }) => {
    await page.goto('/calculators/');
    await expect(page.getByRole('link', { name: 'RAG Pipeline Cost Calculator', includeHidden: true }).first()).toBeVisible();
  });
});
