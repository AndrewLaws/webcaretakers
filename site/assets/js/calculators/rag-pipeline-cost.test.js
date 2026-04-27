'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PRICING_LAST_VERIFIED,
  EMBEDDING_MODELS,
  VECTOR_DBS,
  LLM_MODELS,
  embeddingCost,
  llmQueryCost,
  projectPipeline,
  llmComparison,
  monthByMonth,
} = require('./rag-pipeline-cost.js');

// ── catalogue sanity ───────────────────────────────────────────────────

test('PRICING_LAST_VERIFIED is an ISO date', () => {
  assert.match(PRICING_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
});

test('embedding catalogue includes the four required models', () => {
  const ids = EMBEDDING_MODELS.map(m => m.id);
  assert.ok(ids.includes('text-embedding-3-small'));
  assert.ok(ids.includes('text-embedding-3-large'));
  assert.ok(ids.includes('voyage-3'));
  assert.ok(ids.includes('cohere-embed-v3'));
});

test('vector DB catalogue includes the four required tiers with monthly costs', () => {
  const byId = Object.fromEntries(VECTOR_DBS.map(v => [v.id, v]));
  assert.equal(byId['pinecone-starter'].monthlyCost, 70);
  assert.equal(byId['weaviate-cloud'].monthlyCost, 25);
  assert.equal(byId['pgvector-self-hosted'].monthlyCost, 15);
  assert.equal(byId['qdrant-cloud'].monthlyCost, 25);
});

test('LLM catalogue mirrors the LLM token usage model list', () => {
  const ids = LLM_MODELS.map(m => m.id);
  assert.ok(ids.includes('claude-sonnet-4-6'));
  assert.ok(ids.includes('gpt-5-4'));
  assert.ok(ids.includes('gemini-2-5-pro'));
  assert.ok(LLM_MODELS.length >= 8);
});

// ── embeddingCost ──────────────────────────────────────────────────────

test('embeddingCost is tokens / 1M * pricePer1M', () => {
  const model = { pricePer1M: 0.13 };
  // 5,000,000 tokens × $0.13/1M = $0.65
  assert.equal(embeddingCost({ tokens: 5_000_000, model }), 0.65);
});

test('embeddingCost returns 0 for zero tokens', () => {
  const model = { pricePer1M: 0.13 };
  assert.equal(embeddingCost({ tokens: 0, model }), 0);
});

test('embeddingCost rejects negative tokens', () => {
  const model = { pricePer1M: 0.13 };
  assert.throws(() => embeddingCost({ tokens: -1, model }));
});

// ── llmQueryCost ───────────────────────────────────────────────────────

test('llmQueryCost sums context + prompt as input, response as output', () => {
  // input price $1/1M, output price $2/1M
  const model = { inputPer1M: 1, outputPer1M: 2 };
  const r = llmQueryCost({ contextTokens: 3000, promptTokens: 100, responseTokens: 400, model });
  // input: 3100 tokens × $1 / 1M = 0.0031
  // output: 400 tokens × $2 / 1M = 0.0008
  assert.equal(r.inputTokens, 3100);
  assert.equal(r.outputTokens, 400);
  assert.equal(r.inputCost, 0.0031);
  assert.equal(r.outputCost, 0.0008);
  assert.equal(r.perQuery, 0.0039);
});

// ── projectPipeline ────────────────────────────────────────────────────

test('projectPipeline sums embedding + vector DB + LLM into ongoing month', () => {
  const embeddingModel = { pricePer1M: 0.02 };           // text-embedding-3-small
  const vectorDb = { monthlyCost: 70 };                  // Pinecone Starter
  const llmModel = { inputPer1M: 3, outputPer1M: 15 };   // Claude Sonnet 4.6 shape

  const r = projectPipeline({
    corpusTokens: 5_000_000,
    monthlyNewTokens: 250_000,
    embeddingModel,
    vectorDb,
    queriesPerDay: 5000,
    contextTokens: 3000,
    promptTokens: 100,
    responseTokens: 400,
    llmModel,
  });

  // One-off embedding: 5M × $0.02/1M = $0.10
  assert.equal(r.oneOffEmbedding, 0.10);
  // Monthly embedding: 250k × $0.02/1M = $0.005, rounded to $0.01
  assert.equal(r.monthlyEmbedding, 0.01);
  // Monthly vector DB
  assert.equal(r.monthlyVectorDb, 70);
  // Per query: input 3100 × $3/1M = $0.0093, output 400 × $15/1M = $0.006, total $0.0153
  // Monthly: $0.0153 × 5000 × 30.4375 ≈ $2328.47
  assert.ok(r.monthlyLLM > 2300 && r.monthlyLLM < 2360);
  // Ongoing roughly equals vector DB + LLM (embedding line item is rounded
  // for display so a sub-cent difference is possible).
  assert.ok(Math.abs(r.ongoingMonth - (70 + r.monthlyLLM)) < 0.02);
  // First month is ongoing + one-off corpus cost.
  assert.ok(Math.abs(r.firstMonth - (r.ongoingMonth + r.oneOffEmbedding)) < 0.02);
});

test('projectPipeline first month is greater than ongoing month by the corpus cost', () => {
  const embeddingModel = { pricePer1M: 0.13 };
  const vectorDb = { monthlyCost: 25 };
  const llmModel = { inputPer1M: 1, outputPer1M: 5 };

  const r = projectPipeline({
    corpusTokens: 10_000_000,
    monthlyNewTokens: 500_000,
    embeddingModel,
    vectorDb,
    queriesPerDay: 1000,
    contextTokens: 2000,
    promptTokens: 50,
    responseTokens: 300,
    llmModel,
  });

  // 10M × $0.13/1M = $1.30 corpus
  assert.equal(r.oneOffEmbedding, 1.30);
  assert.equal(Math.round((r.firstMonth - r.ongoingMonth) * 100) / 100, 1.30);
});

// ── llmComparison ──────────────────────────────────────────────────────

test('llmComparison returns one row per LLM, sorted cheapest first', () => {
  const rows = llmComparison({
    corpusTokens: 5_000_000,
    monthlyNewTokens: 250_000,
    embeddingModel: EMBEDDING_MODELS[0],
    vectorDb: VECTOR_DBS[0],
    queriesPerDay: 5000,
    contextTokens: 3000,
    promptTokens: 100,
    responseTokens: 400,
  });
  assert.equal(rows.length, LLM_MODELS.length);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].ongoingMonth >= rows[i - 1].ongoingMonth,
      'expected ascending ongoingMonth at row ' + i);
  }
});

// ── monthByMonth ───────────────────────────────────────────────────────

test('monthByMonth row 1 carries the one-off corpus cost, later rows do not', () => {
  const projection = projectPipeline({
    corpusTokens: 5_000_000,
    monthlyNewTokens: 250_000,
    embeddingModel: { pricePer1M: 0.13 },
    vectorDb: { monthlyCost: 70 },
    queriesPerDay: 1000,
    contextTokens: 3000,
    promptTokens: 100,
    responseTokens: 400,
    llmModel: { inputPer1M: 3, outputPer1M: 15 },
  });

  const rows = monthByMonth({ months: 6, projection });
  assert.equal(rows.length, 6);
  assert.equal(rows[0].total, projection.firstMonth);
  for (let i = 1; i < rows.length; i++) {
    assert.equal(rows[i].total, projection.ongoingMonth);
  }
  assert.ok(rows[0].embedding > rows[1].embedding);
});
