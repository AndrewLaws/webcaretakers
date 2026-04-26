'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MODELS,
  PRICING_LAST_VERIFIED,
  estimateTokens,
  estimateTokensFromText,
  costForRun,
  projectUsage,
  monthlyCost,
  modelComparison,
} = require('./llm-token-usage.js');

// ── Token estimation ──────────────────────────────────────────────────────

test('estimateTokens returns 0 for empty input', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens(undefined), 0);
});

test('estimateTokens uses 4-chars-per-token rounding up', () => {
  // 1 char → 1 token (ceil), 4 chars → 1 token, 5 chars → 2 tokens
  assert.equal(estimateTokens('a'), 1);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('abcde'), 2);
  assert.equal(estimateTokens('abcdefgh'), 2);
});

test('estimateTokens is the same export as estimateTokensFromText', () => {
  assert.equal(estimateTokens, estimateTokensFromText);
});

test('estimateTokens counts whitespace as part of the token budget', () => {
  // Real tokenisers emit tokens for spaces and newlines, so should we.
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  // 44 chars → ceil(44/4) = 11 tokens
  assert.equal(estimateTokens(sentence), 11);
});

// ── costForRun ────────────────────────────────────────────────────────────

test('costForRun: simple flat-priced model', () => {
  const model = { inputPer1M: 10, outputPer1M: 30 };
  // 1M input → $10, 1M output → $30, total $40
  const r = costForRun({ model, inputTokens: 1_000_000, outputTokens: 1_000_000 });
  assert.equal(r.inputCost, 10);
  assert.equal(r.outputCost, 30);
  assert.equal(r.total, 40);
});

test('costForRun: scales linearly below 1M tokens', () => {
  const model = { inputPer1M: 3, outputPer1M: 15 };
  // 1000 input + 500 output: input = 0.003, output = 0.0075, total = 0.0105
  const r = costForRun({ model, inputTokens: 1000, outputTokens: 500 });
  assert.equal(r.inputCost, 0.003);
  assert.equal(r.outputCost, 0.0075);
  assert.equal(r.total, 0.0105);
});

test('costForRun: zero tokens cost nothing', () => {
  const model = { inputPer1M: 99, outputPer1M: 99 };
  const r = costForRun({ model, inputTokens: 0, outputTokens: 0 });
  assert.equal(r.total, 0);
});

test('costForRun: rejects negative tokens and missing prices', () => {
  const model = { inputPer1M: 1, outputPer1M: 2 };
  assert.throws(() => costForRun({ model, inputTokens: -1, outputTokens: 0 }));
  assert.throws(() => costForRun({ model, inputTokens: 0, outputTokens: -1 }));
  assert.throws(() => costForRun({ model: {}, inputTokens: 0, outputTokens: 0 }));
});

// ── projectUsage ──────────────────────────────────────────────────────────

test('projectUsage: 1 USD per call, 100 calls/day → $100/day, ~$3043.75/month', () => {
  const p = projectUsage({ perCallCost: 1, callsPerDay: 100 });
  assert.equal(p.daily, 100);
  // 100 * 30.4375 = 3043.75
  assert.equal(p.monthly, 3043.75);
  // 100 * 365.25 = 36525
  assert.equal(p.annual, 36525);
});

test('projectUsage: zero calls is zero everywhere', () => {
  const p = projectUsage({ perCallCost: 5, callsPerDay: 0 });
  assert.equal(p.daily, 0);
  assert.equal(p.monthly, 0);
  assert.equal(p.annual, 0);
});

test('projectUsage: rejects negative inputs', () => {
  assert.throws(() => projectUsage({ perCallCost: -1, callsPerDay: 1 }));
  assert.throws(() => projectUsage({ perCallCost: 1, callsPerDay: -1 }));
});

// ── monthlyCost ───────────────────────────────────────────────────────────

test('monthlyCost: perDay and perMonth agree when normalised', () => {
  // 10 calls/day @ $0.10 → $30.4375/month
  const fromDay = monthlyCost({ perCallCost: 0.10, calls: 10, frequency: 'perDay' });
  // Same workload expressed as "10 * 30.4375 = 304.375 calls/month"
  const fromMonth = monthlyCost({ perCallCost: 0.10, calls: 10 * 30.4375, frequency: 'perMonth' });
  // Both go through the same rounded monthly path, so they should be equal
  // to within the 2dp rounding the function applies.
  assert.ok(Math.abs(fromDay - fromMonth) < 0.02, 'frequencies should agree');
  assert.equal(fromDay, 30.44);
});

test('monthlyCost: rejects unknown frequency', () => {
  assert.throws(() => monthlyCost({ perCallCost: 1, calls: 1, frequency: 'perWeek' }));
});

// ── modelComparison ───────────────────────────────────────────────────────

test('modelComparison: returns one row per supplied model, sorted cheapest first', () => {
  const models = [
    { id: 'a', name: 'A', vendor: 'X', inputPer1M: 10, outputPer1M: 30 },
    { id: 'b', name: 'B', vendor: 'Y', inputPer1M: 1,  outputPer1M: 2  },
    { id: 'c', name: 'C', vendor: 'Z', inputPer1M: 5,  outputPer1M: 15 },
  ];
  const rows = modelComparison({ inputTokens: 1000, outputTokens: 500, callsPerDay: 100, models });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].id, 'b'); // cheapest
  assert.equal(rows[2].id, 'a'); // most expensive
  // Each row carries projected totals
  rows.forEach(r => {
    assert.ok(typeof r.monthly === 'number');
    assert.ok(typeof r.annual === 'number');
    assert.ok(typeof r.perCall === 'number');
  });
});

test('modelComparison: defaults to baked-in MODELS list', () => {
  const rows = modelComparison({ inputTokens: 1000, outputTokens: 500, callsPerDay: 100 });
  assert.equal(rows.length, MODELS.length);
  assert.ok(rows.length >= 4, 'should expose at least four frontier models');
});

// ── Pricing sanity ────────────────────────────────────────────────────────

test('every baked-in model has plausible non-zero pricing', () => {
  MODELS.forEach(m => {
    assert.ok(m.id && typeof m.id === 'string', `${m.name} missing id`);
    assert.ok(m.name && typeof m.name === 'string', `${m.id} missing name`);
    assert.ok(m.vendor, `${m.id} missing vendor`);
    assert.ok(m.inputPer1M > 0, `${m.id} input price must be positive`);
    assert.ok(m.outputPer1M > 0, `${m.id} output price must be positive`);
    // Output is almost always >= input on commercial models. Catch a typo
    // that would silently flip a column.
    assert.ok(m.outputPer1M >= m.inputPer1M, `${m.id} output price unexpectedly cheaper than input`);
  });
});

test('PRICING_LAST_VERIFIED is an ISO date string', () => {
  assert.match(PRICING_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
});

test('vendor coverage includes Anthropic, OpenAI and Google', () => {
  const vendors = new Set(MODELS.map(m => m.vendor));
  assert.ok(vendors.has('Anthropic'));
  assert.ok(vendors.has('OpenAI'));
  assert.ok(vendors.has('Google'));
});
