'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MODELS,
  PRICING_LAST_VERIFIED,
  TOKENS_PER_WORD,
  wordsToTokens,
  llmMonthlyCost,
  humanMonthlyCost,
  breakevenWords,
  modelComparison,
} = require('./ai-vs-human-writer-cost.js');

// ── wordsToTokens ─────────────────────────────────────────────────────────

test('wordsToTokens: 1000 words → ~1300 tokens at 1.3 tokens/word', () => {
  assert.equal(wordsToTokens(1000), Math.ceil(1000 * TOKENS_PER_WORD));
  assert.equal(wordsToTokens(1000), 1300);
});

test('wordsToTokens: zero words → zero tokens', () => {
  assert.equal(wordsToTokens(0), 0);
});

test('wordsToTokens: rejects negatives', () => {
  assert.throws(() => wordsToTokens(-1));
});

// ── llmMonthlyCost ────────────────────────────────────────────────────────

test('llmMonthlyCost: 50,000 words/month on Sonnet 4.6, 1000-word articles, 800 input tokens', () => {
  const sonnet = MODELS.find(m => m.id === 'claude-sonnet-4-6');
  const r = llmMonthlyCost({
    model: sonnet,
    wordsPerMonth: 50_000,
    articleWords: 1000,
    inputTokensPerArticle: 800,
  });
  // 50 articles. Each: input = 800/1M*$3 = $0.0024, output = 1300/1M*$15 = $0.0195.
  // Per article: $0.0219. Monthly: 50 * $0.0219 = $1.095 → rounded to $1.10
  assert.equal(r.articlesPerMonth, 50);
  assert.equal(r.outputTokensPerArticle, 1300);
  assert.equal(r.inputTokensPerArticle, 800);
  assert.ok(Math.abs(r.costPerArticle - 0.0219) < 0.0001);
  assert.equal(r.monthly, 1.10);
});

test('llmMonthlyCost: zero word target → zero monthly', () => {
  const sonnet = MODELS.find(m => m.id === 'claude-sonnet-4-6');
  const r = llmMonthlyCost({
    model: sonnet,
    wordsPerMonth: 0,
    articleWords: 1000,
    inputTokensPerArticle: 800,
  });
  assert.equal(r.monthly, 0);
});

test('llmMonthlyCost: rejects bad inputs', () => {
  const sonnet = MODELS.find(m => m.id === 'claude-sonnet-4-6');
  assert.throws(() => llmMonthlyCost({ model: sonnet, wordsPerMonth: -1, articleWords: 1000, inputTokensPerArticle: 800 }));
  assert.throws(() => llmMonthlyCost({ model: sonnet, wordsPerMonth: 1000, articleWords: 0, inputTokensPerArticle: 800 }));
  assert.throws(() => llmMonthlyCost({ model: sonnet, wordsPerMonth: 1000, articleWords: 1000, inputTokensPerArticle: -1 }));
  assert.throws(() => llmMonthlyCost({ model: {}, wordsPerMonth: 1000, articleWords: 1000, inputTokensPerArticle: 800 }));
});

// ── humanMonthlyCost ──────────────────────────────────────────────────────

test('humanMonthlyCost: per-word mode at $0.15 × 50,000 words = $7,500', () => {
  const r = humanMonthlyCost({ wordsPerMonth: 50_000, mode: 'perWord', perWordRate: 0.15 });
  assert.equal(r.monthly, 7500);
  assert.equal(r.effectivePerWord, 0.15);
  assert.equal(r.hours, null);
});

test('humanMonthlyCost: per-hour mode at $50/hr, 500 wph, 50,000 words = 100 hours = $5,000', () => {
  const r = humanMonthlyCost({ wordsPerMonth: 50_000, mode: 'perHour', hourlyRate: 50, wordsPerHour: 500 });
  assert.equal(r.hours, 100);
  assert.equal(r.monthly, 5000);
  assert.equal(r.effectivePerWord, 0.10);
});

test('humanMonthlyCost: rejects invalid mode and missing rates', () => {
  assert.throws(() => humanMonthlyCost({ wordsPerMonth: 1000, mode: 'perFortnight', perWordRate: 0.1 }));
  assert.throws(() => humanMonthlyCost({ wordsPerMonth: 1000, mode: 'perHour', hourlyRate: 50, wordsPerHour: 0 }));
  assert.throws(() => humanMonthlyCost({ wordsPerMonth: -1, mode: 'perWord', perWordRate: 0.15 }));
});

// ── breakevenWords / verdict ──────────────────────────────────────────────

test('breakevenWords: with default human rate, every model is cheaper than human per word', () => {
  // $0.15/word human is roughly 100x what even the priciest LLM charges per
  // word for a 1000-word article with 800 input tokens of overhead. Verdict
  // should be llm-cheaper for every baked-in model.
  MODELS.forEach(m => {
    const r = breakevenWords({
      model: m,
      articleWords: 1000,
      inputTokensPerArticle: 800,
      humanPerWord: 0.15,
    });
    assert.equal(r.verdict, 'llm-cheaper', `${m.id} should be cheaper than $0.15/word human`);
    assert.ok(r.llmPerWord < 0.15);
  });
});

test('breakevenWords: ridiculously cheap human rate flips the verdict', () => {
  const opus = MODELS.find(m => m.id === 'claude-opus-4-7');
  const r = breakevenWords({
    model: opus,
    articleWords: 1000,
    inputTokensPerArticle: 800,
    humanPerWord: 0.00001, // a thousandth of a cent per word
  });
  assert.equal(r.verdict, 'human-cheaper');
});

// ── modelComparison ───────────────────────────────────────────────────────

test('modelComparison: returns one row per model, sorted cheapest first', () => {
  const rows = modelComparison({
    wordsPerMonth: 50_000,
    articleWords: 1000,
    inputTokensPerArticle: 800,
  });
  assert.equal(rows.length, MODELS.length);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].monthly >= rows[i - 1].monthly,
      `row ${i} (${rows[i].id} @ $${rows[i].monthly}) should be >= row ${i - 1} (${rows[i - 1].id} @ $${rows[i - 1].monthly})`);
  }
});

// ── Sanity ────────────────────────────────────────────────────────────────

test('every baked-in model has plausible non-zero pricing', () => {
  MODELS.forEach(m => {
    assert.ok(m.id && typeof m.id === 'string');
    assert.ok(m.name && typeof m.name === 'string');
    assert.ok(m.vendor);
    assert.ok(m.inputPer1M > 0);
    assert.ok(m.outputPer1M > 0);
    assert.ok(m.outputPer1M >= m.inputPer1M);
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
