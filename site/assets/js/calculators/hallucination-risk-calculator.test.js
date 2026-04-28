'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MODEL_CLASSES,
  TASK_TYPES,
  GROUNDING,
  VERIFICATION,
  STAKES,
  score,
  bandFor,
  recommend,
} = require('./hallucination-risk-calculator.js');

// ── Multiplier wiring ─────────────────────────────────────────────────────

test('model class multipliers are wired correctly', () => {
  assert.equal(MODEL_CLASSES.frontier.multiplier, 1.0);
  assert.equal(MODEL_CLASSES.midTier.multiplier, 1.4);
  assert.equal(MODEL_CLASSES.small.multiplier, 2.2);
  assert.equal(MODEL_CLASSES.fineTunedDomain.multiplier, 0.7);
});

test('grounding multiplier is applied to the raw score', () => {
  // Mid-tier (1.4), general Q&A (base 30), grounding=none (1.0), verification=none (1.0)
  const raw = score({
    modelClass: 'midTier',
    taskType: 'generalQA',
    grounding: 'none',
    verification: 'none',
    stakes: 'low',
  });
  // 30 * 1.4 * 1.0 * 1.0 = 42
  assert.equal(raw.score, 42);

  const grounded = score({
    modelClass: 'midTier',
    taskType: 'generalQA',
    grounding: 'rag',
    verification: 'none',
    stakes: 'low',
  });
  // 30 * 1.4 * 0.5 * 1.0 = 21
  assert.equal(grounded.score, 21);
});

test('verification multiplier is applied (human review = 0.4)', () => {
  // Frontier (1.0), citation (base 85), grounding=none (1.0), verification=human (0.4)
  // 85 * 1.0 * 1.0 * 0.4 = 34
  const r = score({
    modelClass: 'frontier',
    taskType: 'citation',
    grounding: 'none',
    verification: 'human',
    stakes: 'high',
  });
  assert.equal(r.score, 34);
});

// ── Cap at 100 ────────────────────────────────────────────────────────────

test('score is capped at 100 even when raw maths exceeds it', () => {
  // Small model (2.2), citation (85), no grounding, no verification.
  // 85 * 2.2 = 187 raw. Should clamp to 100.
  const r = score({
    modelClass: 'small',
    taskType: 'citation',
    grounding: 'none',
    verification: 'none',
    stakes: 'high',
  });
  assert.equal(r.score, 100);
  assert.equal(r.raw > 100, true);
});

// ── Band thresholds ───────────────────────────────────────────────────────

test('bandFor returns the right label at each threshold', () => {
  assert.equal(bandFor(0), 'Low');
  assert.equal(bandFor(25), 'Low');
  assert.equal(bandFor(26), 'Moderate');
  assert.equal(bandFor(50), 'Moderate');
  assert.equal(bandFor(51), 'High');
  assert.equal(bandFor(75), 'High');
  assert.equal(bandFor(76), 'Critical');
  assert.equal(bandFor(100), 'Critical');
});

// ── Recommendation logic ──────────────────────────────────────────────────

test('safety-critical stakes with high score recommends do-not-deploy language', () => {
  const r = score({
    modelClass: 'small',
    taskType: 'numerical',
    grounding: 'none',
    verification: 'none',
    stakes: 'safetyCritical',
  });
  assert.equal(r.band, 'Critical');
  assert.match(r.recommendation, /do not deploy|do not ship|not safe|hold/i);
});

test('safety-critical stakes always recommends extra controls, even at low score', () => {
  // Best case across the board: fine-tuned (0.7), creative (10), KG (0.3),
  // programmatic (0.5). 10 * 0.7 * 0.3 * 0.5 = 1.05, but stakes are
  // safety-critical, so the recommendation must still flag the stakes.
  const r = score({
    modelClass: 'fineTunedDomain',
    taskType: 'creative',
    grounding: 'knowledgeGraph',
    verification: 'programmatic',
    stakes: 'safetyCritical',
  });
  assert.equal(r.band, 'Low');
  assert.match(r.recommendation, /safety[- ]critical|sign[- ]off|domain expert/i);
});

// ── Stakes does not affect score ──────────────────────────────────────────

test('stakes level does not change the numeric score', () => {
  const base = {
    modelClass: 'midTier',
    taskType: 'factual',
    grounding: 'webSearch',
    verification: 'secondPass',
  };
  const low = score(Object.assign({}, base, { stakes: 'low' }));
  const high = score(Object.assign({}, base, { stakes: 'high' }));
  const sc = score(Object.assign({}, base, { stakes: 'safetyCritical' }));
  assert.equal(low.score, high.score);
  assert.equal(low.score, sc.score);
  // But the recommendation text should still differ.
  assert.notEqual(low.recommendation, sc.recommendation);
});

// ── Edge case: all-best returns very low ──────────────────────────────────

test('all-best-options returns a very low (≤5) score', () => {
  const r = score({
    modelClass: 'fineTunedDomain',
    taskType: 'creative',
    grounding: 'knowledgeGraph',
    verification: 'programmatic',
    stakes: 'low',
  });
  // 10 * 0.7 * 0.3 * 0.5 = 1.05
  assert.ok(r.score <= 5, `expected very low score, got ${r.score}`);
  assert.equal(r.band, 'Low');
});

// ── Breakdown is exposed ──────────────────────────────────────────────────

test('breakdown shows base, each multiplier, and the running product', () => {
  const r = score({
    modelClass: 'frontier',
    taskType: 'generalQA',
    grounding: 'rag',
    verification: 'human',
    stakes: 'medium',
  });
  // 30 * 1.0 * 0.5 * 0.4 = 6
  assert.equal(r.breakdown.baseRisk, 30);
  assert.equal(r.breakdown.modelMultiplier, 1.0);
  assert.equal(r.breakdown.groundingMultiplier, 0.5);
  assert.equal(r.breakdown.verificationMultiplier, 0.4);
  assert.equal(r.breakdown.product, 6);
  assert.equal(r.score, 6);
});

// ── Task base weights ascend roughly as expected ──────────────────────────

test('task base weights ascend from creative to citation', () => {
  assert.ok(TASK_TYPES.creative.baseRisk < TASK_TYPES.generalQA.baseRisk);
  assert.ok(TASK_TYPES.generalQA.baseRisk < TASK_TYPES.factual.baseRisk);
  assert.ok(TASK_TYPES.factual.baseRisk < TASK_TYPES.numerical.baseRisk);
  assert.ok(TASK_TYPES.numerical.baseRisk < TASK_TYPES.citation.baseRisk);
});

// ── Recommend helper directly ─────────────────────────────────────────────

test('recommend returns stakes-aware copy', () => {
  const r = recommend({ band: 'High', stakes: 'safetyCritical' });
  assert.match(r, /safety[- ]critical|do not/i);
  const r2 = recommend({ band: 'Low', stakes: 'low' });
  assert.match(r2, /spot[- ]check|sense[- ]check|low/i);
});
