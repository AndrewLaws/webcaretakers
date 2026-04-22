'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  calculateWebsiteSpeedBudget,
  SITE_TYPES, CONNECTION_TARGETS, BUDGETS, CWV_TARGETS, CWV_GOOD
} = require('./website-speed-budget.js');

// ─── Basic output shape ──────────────────────────────────────────────────────

test('returns budget for ecommerce + mobile_fast', () => {
  const r = calculateWebsiteSpeedBudget({ siteType: 'ecommerce', connectionTarget: 'mobile_fast' });
  assert.equal(r.siteType, 'ecommerce');
  assert.equal(r.connectionTarget, 'mobile_fast');
  assert.ok(r.budget.totalKb > 0);
  assert.ok(r.budget.jsKb > 0);
  assert.ok(r.budget.imagesKb > 0);
});

test('budget for blog + mobile_slow is lower total than desktop', () => {
  const slow    = calculateWebsiteSpeedBudget({ siteType: 'blog', connectionTarget: 'mobile_slow' });
  const desktop = calculateWebsiteSpeedBudget({ siteType: 'blog', connectionTarget: 'desktop' });
  assert.ok(slow.budget.totalKb < desktop.budget.totalKb);
});

test('CWV targets are included', () => {
  const r = calculateWebsiteSpeedBudget({ siteType: 'saas', connectionTarget: 'desktop' });
  assert.ok(r.cwvTargets.lcp > 0);
  assert.ok(r.cwvTargets.cls >= 0);
  assert.ok(r.cwvTargets.inp > 0);
});

test('cwvTargets are tighter than cwvGoodThresholds', () => {
  const r = calculateWebsiteSpeedBudget({ siteType: 'ecommerce', connectionTarget: 'desktop' });
  assert.ok(r.cwvTargets.lcp  <= r.cwvGoodThresholds.lcp);
  assert.ok(r.cwvTargets.cls  <= r.cwvGoodThresholds.cls);
  assert.ok(r.cwvTargets.inp  <= r.cwvGoodThresholds.inp);
});

test('siteTypeLabel and connectionLabel are strings', () => {
  const r = calculateWebsiteSpeedBudget({ siteType: 'portfolio', connectionTarget: 'mobile_fast' });
  assert.equal(typeof r.siteTypeLabel,    'string');
  assert.equal(typeof r.connectionLabel,  'string');
});

// ─── Revenue impact ──────────────────────────────────────────────────────────

test('revenueImpact is null when no optional inputs provided', () => {
  const r = calculateWebsiteSpeedBudget({ siteType: 'ecommerce', connectionTarget: 'mobile_fast' });
  assert.equal(r.revenueImpact, null);
});

test('revenueImpact is null when load time is at or below optimal (2s)', () => {
  const r = calculateWebsiteSpeedBudget({
    siteType: 'ecommerce', connectionTarget: 'mobile_fast',
    monthlyVisitors: 10000, currentLoadTime: 2, conversionRate: 2, avgOrderValue: 50
  });
  assert.equal(r.revenueImpact, null);
});

test('revenueImpact calculated for 5-second ecommerce load time', () => {
  // 5s - 2s = 3 extra seconds; loss = 3 * 0.07 = 21%
  // current: 10000 * 0.02 * 50 = £10,000/mo
  // optimalConvRate = 0.02 / (1 - 0.21) = 0.02532
  // optimal: 10000 * 0.02532 * 50 = £12,658
  // gap ≈ £2,658/mo, £31,899/year
  const r = calculateWebsiteSpeedBudget({
    siteType: 'ecommerce', connectionTarget: 'mobile_fast',
    monthlyVisitors: 10000, currentLoadTime: 5, conversionRate: 2, avgOrderValue: 50
  });
  assert.ok(r.revenueImpact !== null);
  assert.ok(r.revenueImpact.monthlyRevenueGap > 0);
  assert.equal(r.revenueImpact.annualRevenueGap, r.revenueImpact.monthlyRevenueGap * 12);
  assert.ok(r.revenueImpact.estimatedLossPercent > 0);
});

test('revenue loss is capped at 80%', () => {
  // Extremely slow site — 20 extra seconds
  const r = calculateWebsiteSpeedBudget({
    siteType: 'ecommerce', connectionTarget: 'mobile_fast',
    monthlyVisitors: 100000, currentLoadTime: 22, conversionRate: 3, avgOrderValue: 100
  });
  assert.ok(r.revenueImpact.estimatedLossPercent <= 80);
});

// ─── All site types / connections ───────────────────────────────────────────

const siteTypes   = Object.keys(SITE_TYPES);
const connections = Object.keys(CONNECTION_TARGETS);

for (const st of siteTypes) {
  for (const ct of connections) {
    test(`budget exists for ${st} × ${ct}`, () => {
      const r = calculateWebsiteSpeedBudget({ siteType: st, connectionTarget: ct });
      assert.ok(r.budget.totalKb > 0);
    });
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

test('throws on invalid siteType', () => {
  assert.throws(
    () => calculateWebsiteSpeedBudget({ siteType: 'forum', connectionTarget: 'desktop' }),
    /invalid siteType/
  );
});

test('throws on invalid connectionTarget', () => {
  assert.throws(
    () => calculateWebsiteSpeedBudget({ siteType: 'blog', connectionTarget: 'satellite' }),
    /invalid connectionTarget/
  );
});
