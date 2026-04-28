'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PRICING_LAST_VERIFIED,
  TUNING_MODELS,
  WORDS_TO_TOKENS,
  wordsToTokens,
  trainingTokens,
  trainingCost,
  inferenceCostPer1000,
  estimate,
} = require('./fine-tuning-cost.js');

// ── catalogue sanity ───────────────────────────────────────────────────

test('PRICING_LAST_VERIFIED is an ISO date', () => {
  assert.match(PRICING_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
});

test('model catalogue includes the five required presets', () => {
  const ids = TUNING_MODELS.map(m => m.id);
  assert.ok(ids.includes('gpt-4o-mini'));
  assert.ok(ids.includes('gpt-4o'));
  assert.ok(ids.includes('llama-3-8b-together'));
  assert.ok(ids.includes('llama-3-70b-together'));
  assert.ok(ids.includes('mistral-7b'));
});

test('every tuning model exposes training and hosted inference rates', () => {
  TUNING_MODELS.forEach(m => {
    assert.equal(typeof m.trainingPer1M, 'number', m.id + ' missing trainingPer1M');
    assert.equal(typeof m.tunedInputPer1M, 'number', m.id + ' missing tunedInputPer1M');
    assert.equal(typeof m.tunedOutputPer1M, 'number', m.id + ' missing tunedOutputPer1M');
    assert.ok(m.trainingPer1M >= 0);
  });
});

// ── word → token conversion ────────────────────────────────────────────

test('wordsToTokens uses the 1.33 tokens-per-word factor', () => {
  assert.equal(WORDS_TO_TOKENS, 1.33);
  // 1000 words × 1.33 = 1330 tokens
  assert.equal(wordsToTokens(1000), 1330);
});

test('wordsToTokens rounds to whole tokens and rejects negatives', () => {
  assert.equal(wordsToTokens(0), 0);
  assert.equal(wordsToTokens(3), 4); // 3 × 1.33 = 3.99 → 4
  assert.throws(() => wordsToTokens(-1));
});

// ── epoch multiplication ───────────────────────────────────────────────

test('trainingTokens multiplies data tokens by epochs', () => {
  assert.equal(trainingTokens({ dataTokens: 100000, epochs: 3 }), 300000);
  assert.equal(trainingTokens({ dataTokens: 50000, epochs: 1 }), 50000);
});

test('trainingTokens treats zero data tokens as zero training tokens', () => {
  assert.equal(trainingTokens({ dataTokens: 0, epochs: 5 }), 0);
});

test('trainingTokens rejects fractional or negative epochs', () => {
  assert.throws(() => trainingTokens({ dataTokens: 1000, epochs: 0 }));
  assert.throws(() => trainingTokens({ dataTokens: 1000, epochs: -2 }));
  assert.throws(() => trainingTokens({ dataTokens: 1000, epochs: 1.5 }));
});

// ── model rate selection / training cost ───────────────────────────────

test('trainingCost uses the selected model rate', () => {
  const model = { trainingPer1M: 25 }; // arbitrary $25/1M
  // 4M training tokens × $25/1M = $100
  assert.equal(trainingCost({ totalTrainingTokens: 4_000_000, model }), 100);
});

test('trainingCost is zero for zero training tokens', () => {
  const model = { trainingPer1M: 25 };
  assert.equal(trainingCost({ totalTrainingTokens: 0, model }), 0);
});

test('trainingCost throws when the model is missing or malformed', () => {
  assert.throws(() => trainingCost({ totalTrainingTokens: 1000, model: null }));
  assert.throws(() => trainingCost({ totalTrainingTokens: 1000, model: {} }));
});

test('different model rates produce different training costs', () => {
  const cheap = TUNING_MODELS.find(m => m.id === 'llama-3-8b-together');
  const expensive = TUNING_MODELS.find(m => m.id === 'gpt-4o');
  const tokens = 5_000_000;
  const cheapCost = trainingCost({ totalTrainingTokens: tokens, model: cheap });
  const expensiveCost = trainingCost({ totalTrainingTokens: tokens, model: expensive });
  assert.ok(expensiveCost > cheapCost, 'GPT-4o tuning should cost more than Llama-3-8B tuning');
});

// ── inference cost per 1000 calls ──────────────────────────────────────

test('inferenceCostPer1000 prices input and output at the tuned rates', () => {
  const model = { tunedInputPer1M: 6, tunedOutputPer1M: 24 };
  // Per call: 1000 input × $6/1M = $0.006, 200 output × $24/1M = $0.0048, total $0.0108
  // Per 1000 calls: $10.80
  const r = inferenceCostPer1000({ inputTokens: 1000, outputTokens: 200, model });
  assert.equal(r.perCall, 0.0108);
  assert.equal(r.per1000, 10.80);
});

// ── full estimate ──────────────────────────────────────────────────────

test('estimate returns training tokens, training cost, and inference cost', () => {
  const model = TUNING_MODELS.find(m => m.id === 'gpt-4o-mini');
  const r = estimate({
    dataTokens: 1_000_000,
    epochs: 3,
    inputTokens: 500,
    outputTokens: 150,
    model,
  });
  assert.equal(r.totalTrainingTokens, 3_000_000);
  // training cost = 3M / 1M × model.trainingPer1M
  assert.equal(r.trainingCost, Math.round(3 * model.trainingPer1M * 100) / 100);
  assert.ok(r.inferencePer1000 > 0);
  assert.equal(r.modelName, model.name);
});

test('estimate handles zero data tokens edge case', () => {
  const model = TUNING_MODELS[0];
  const r = estimate({ dataTokens: 0, epochs: 3, inputTokens: 500, outputTokens: 150, model });
  assert.equal(r.totalTrainingTokens, 0);
  assert.equal(r.trainingCost, 0);
});

test('estimate throws when the model is missing', () => {
  assert.throws(() => estimate({ dataTokens: 100000, epochs: 3, inputTokens: 500, outputTokens: 150, model: null }));
});
