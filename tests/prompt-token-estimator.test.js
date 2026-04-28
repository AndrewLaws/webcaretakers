const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../site/assets/js/calculators/prompt-token-estimator.js');

test('exposes estimateTokens, estimateCost and MODELS', () => {
  assert.equal(typeof lib.estimateTokens, 'function');
  assert.equal(typeof lib.estimateCost, 'function');
  assert.ok(Array.isArray(lib.MODELS));
  assert.ok(lib.MODELS.length >= 6);
});

test('empty prompt returns zero tokens, zero words, zero chars', () => {
  const r = lib.estimateTokens({ prompt: '', model: 'gpt-4o' });
  assert.equal(r.tokens, 0);
  assert.equal(r.words, 0);
  assert.equal(r.chars, 0);
});

test('whitespace-only prompt returns zero tokens', () => {
  const r = lib.estimateTokens({ prompt: '   \n  ', model: 'gpt-4o' });
  assert.equal(r.tokens, 0);
  assert.equal(r.words, 0);
});

test('GPT family uses chars/4 baseline', () => {
  // 100-character string: tokens should be 25 (100/4) for gpt-4o
  const prompt = 'a'.repeat(100);
  const r = lib.estimateTokens({ prompt, model: 'gpt-4o' });
  assert.equal(r.chars, 100);
  assert.equal(r.tokens, 25);
});

test('Claude family uses chars/3.8 (slightly more tokens than GPT)', () => {
  const prompt = 'a'.repeat(100);
  const claude = lib.estimateTokens({ prompt, model: 'claude-3-7-sonnet' });
  const gpt = lib.estimateTokens({ prompt, model: 'gpt-4o' });
  // 100 / 3.8 = 26.31... rounded to 26
  assert.equal(claude.tokens, Math.round(100 / 3.8));
  assert.ok(claude.tokens > gpt.tokens);
});

test('Gemini family uses chars/4.1 (slightly fewer tokens than GPT)', () => {
  const prompt = 'a'.repeat(100);
  const r = lib.estimateTokens({ prompt, model: 'gemini-1-5-pro' });
  assert.equal(r.tokens, Math.round(100 / 4.1));
});

test('Llama family uses chars/3.5 (more tokens per char)', () => {
  const prompt = 'a'.repeat(100);
  const r = lib.estimateTokens({ prompt, model: 'llama-3' });
  assert.equal(r.tokens, Math.round(100 / 3.5));
});

test('Mistral family uses chars/3.7', () => {
  const prompt = 'a'.repeat(100);
  const r = lib.estimateTokens({ prompt, model: 'mistral' });
  assert.equal(r.tokens, Math.round(100 / 3.7));
});

test('unknown model falls back to chars/4 baseline', () => {
  const prompt = 'a'.repeat(100);
  const r = lib.estimateTokens({ prompt, model: 'no-such-model' });
  assert.equal(r.tokens, 25);
});

test('word count counts whitespace-separated tokens', () => {
  const r = lib.estimateTokens({ prompt: 'one two three four five', model: 'gpt-4o' });
  assert.equal(r.words, 5);
});

test('multi-line prompt counts characters including newlines', () => {
  const prompt = 'hello\nworld';
  const r = lib.estimateTokens({ prompt, model: 'gpt-4o' });
  assert.equal(r.chars, 11);
});

test('estimateCost: 1000 tokens at $0.005 per 1k = $0.005', () => {
  const cost = lib.estimateCost({ tokens: 1000, pricePer1k: 0.005 });
  assert.equal(cost, 0.005);
});

test('estimateCost: 0 price returns 0', () => {
  const cost = lib.estimateCost({ tokens: 12345, pricePer1k: 0 });
  assert.equal(cost, 0);
});

test('estimateCost: undefined or invalid price returns null', () => {
  assert.equal(lib.estimateCost({ tokens: 100 }), null);
  assert.equal(lib.estimateCost({ tokens: 100, pricePer1k: -1 }), null);
  assert.equal(lib.estimateCost({ tokens: 100, pricePer1k: NaN }), null);
});

test('estimateCost scales linearly with tokens', () => {
  const a = lib.estimateCost({ tokens: 500, pricePer1k: 0.01 });
  const b = lib.estimateCost({ tokens: 5000, pricePer1k: 0.01 });
  assert.equal(a, 0.005);
  assert.equal(b, 0.05);
});

test('MODELS includes the requested family identifiers', () => {
  const ids = lib.MODELS.map((m) => m.id);
  assert.ok(ids.some((id) => id.startsWith('gpt-4o')));
  assert.ok(ids.some((id) => id.startsWith('claude')));
  assert.ok(ids.some((id) => id.startsWith('gemini')));
  assert.ok(ids.some((id) => id.startsWith('llama')));
  assert.ok(ids.some((id) => id.startsWith('mistral')));
});
