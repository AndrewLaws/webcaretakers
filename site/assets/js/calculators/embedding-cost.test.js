const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  EMBEDDING_MODELS,
  estimateEmbeddingCost,
  totalTokens,
  PRICING_LAST_VERIFIED,
} = require('./embedding-cost.js');

test('exports five model presets including Custom', () => {
  const ids = EMBEDDING_MODELS.map((m) => m.id);
  assert.ok(ids.includes('text-embedding-3-small'));
  assert.ok(ids.includes('text-embedding-3-large'));
  assert.ok(ids.includes('cohere-embed-v3'));
  assert.ok(ids.includes('voyage-3'));
  assert.ok(ids.includes('custom'));
});

test('PRICING_LAST_VERIFIED is an ISO date string', () => {
  assert.match(PRICING_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
});

test('totalTokens multiplies docs by avg words by tokens-per-word ratio', () => {
  // 1000 docs * 500 words * 1.3 = 650,000 tokens
  assert.equal(totalTokens({ docCount: 1000, avgWords: 500, wordsToTokens: 1.3 }), 650000);
});

test('one-off cost: 1M tokens on 3-small ($0.02/M) is $0.02', () => {
  const r = estimateEmbeddingCost({
    docCount: 2000, avgWords: 385, wordsToTokens: 1.3, // 1,001,000 ≈ 1M
    modelId: 'text-embedding-3-small', refresh: 'one-off', months: 12,
  });
  assert.ok(Math.abs(r.oneOffCost - 0.020020) < 1e-4);
  assert.equal(r.monthlyCost, 0);
  assert.ok(Math.abs(r.totalCost - r.oneOffCost) < 1e-9);
});

test('monthly refresh: total = oneOff + monthly * months', () => {
  const r = estimateEmbeddingCost({
    docCount: 1000, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-small', refresh: 'monthly', months: 6,
  });
  // 650,000 tokens × $0.02/M = $0.013 per refresh
  assert.ok(Math.abs(r.oneOffCost - 0.013) < 1e-6);
  assert.ok(Math.abs(r.monthlyCost - 0.013) < 1e-6);
  // total = oneOff + 6 * monthly
  const expected = r.oneOffCost + 6 * r.monthlyCost;
  assert.ok(Math.abs(r.totalCost - expected) < 1e-9);
});

test('weekly refresh costs more per month than monthly refresh', () => {
  const monthly = estimateEmbeddingCost({
    docCount: 1000, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-large', refresh: 'monthly', months: 12,
  });
  const weekly = estimateEmbeddingCost({
    docCount: 1000, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-large', refresh: 'weekly', months: 12,
  });
  assert.ok(weekly.monthlyCost > monthly.monthlyCost);
  // Weekly = ~4.345 refreshes/month vs 1 for monthly
  const ratio = weekly.monthlyCost / monthly.monthlyCost;
  assert.ok(ratio > 4 && ratio < 5, 'expected ratio ~4.345, got ' + ratio);
});

test('daily refresh costs ~30.4375 times the monthly figure', () => {
  const monthly = estimateEmbeddingCost({
    docCount: 100, avgWords: 1000, wordsToTokens: 1.3,
    modelId: 'voyage-3', refresh: 'monthly', months: 1,
  });
  const daily = estimateEmbeddingCost({
    docCount: 100, avgWords: 1000, wordsToTokens: 1.3,
    modelId: 'voyage-3', refresh: 'daily', months: 1,
  });
  const ratio = daily.monthlyCost / monthly.monthlyCost;
  assert.ok(Math.abs(ratio - 30.4375) < 0.001, 'expected ~30.4375, got ' + ratio);
});

test('custom price is honoured when modelId is custom', () => {
  const r = estimateEmbeddingCost({
    docCount: 1000, avgWords: 1000, wordsToTokens: 1.0, // 1M tokens
    modelId: 'custom', customPrice: 0.50, refresh: 'one-off', months: 1,
  });
  // 1M tokens × $0.50/M = $0.50
  assert.ok(Math.abs(r.oneOffCost - 0.50) < 1e-6);
  assert.equal(r.pricePer1M, 0.50);
});

test('per-1000-docs cost equals one-off cost scaled to 1000 docs', () => {
  const r = estimateEmbeddingCost({
    docCount: 5000, avgWords: 400, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-small', refresh: 'one-off', months: 1,
  });
  // 5000 docs cost X. 1000 docs costs X / 5.
  const expectedPer1000 = r.oneOffCost / 5;
  assert.ok(Math.abs(r.per1000DocsCost - expectedPer1000) < 1e-6);
});

test('zero docs returns zero cost', () => {
  const r = estimateEmbeddingCost({
    docCount: 0, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-small', refresh: 'monthly', months: 12,
  });
  assert.equal(r.totalTokens, 0);
  assert.equal(r.oneOffCost, 0);
  assert.equal(r.monthlyCost, 0);
  assert.equal(r.totalCost, 0);
});

test('negative inputs throw a clear error', () => {
  assert.throws(() => estimateEmbeddingCost({
    docCount: -10, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-small', refresh: 'monthly', months: 12,
  }), /docCount|negative|positive/i);
});

test('unknown modelId throws', () => {
  assert.throws(() => estimateEmbeddingCost({
    docCount: 100, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'made-up-model', refresh: 'one-off', months: 1,
  }));
});

test('custom modelId with non-positive customPrice throws', () => {
  assert.throws(() => estimateEmbeddingCost({
    docCount: 100, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'custom', customPrice: 0, refresh: 'one-off', months: 1,
  }), /custom/i);
});

test('result includes dimensions from the preset', () => {
  const r = estimateEmbeddingCost({
    docCount: 100, avgWords: 500, wordsToTokens: 1.3,
    modelId: 'text-embedding-3-large', refresh: 'one-off', months: 1,
  });
  assert.equal(r.dimensions, 3072);
});
