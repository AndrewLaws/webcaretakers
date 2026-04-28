const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  estimateBreachCost,
  SECTORS,
  REGIONS,
  SENSITIVITY,
  REGULATORY,
} = require('./data-breach-cost-estimator.js');

test('SECTORS export covers the seven 2024 IBM/Ponemon bands', () => {
  const slugs = SECTORS.map((s) => s.slug);
  ['healthcare', 'financial', 'tech', 'services', 'retail', 'public', 'other'].forEach((s) => {
    assert.ok(slugs.includes(s), 'missing sector ' + s);
  });
});

test('Healthcare per-record cost is $408', () => {
  const sec = SECTORS.find((s) => s.slug === 'healthcare');
  assert.equal(sec.perRecord, 408);
});

test('Region multipliers match the brief', () => {
  assert.equal(REGIONS.find((r) => r.slug === 'us').multiplier, 1.0);
  assert.equal(REGIONS.find((r) => r.slug === 'eu').multiplier, 0.85);
  assert.equal(REGIONS.find((r) => r.slug === 'uk').multiplier, 0.92);
  assert.equal(REGIONS.find((r) => r.slug === 'other').multiplier, 0.7);
});

test('Sensitivity multipliers match the brief', () => {
  assert.equal(SENSITIVITY.find((s) => s.slug === 'pii').multiplier, 1.0);
  assert.equal(SENSITIVITY.find((s) => s.slug === 'financial').multiplier, 1.2);
  assert.equal(SENSITIVITY.find((s) => s.slug === 'health').multiplier, 1.4);
  assert.equal(SENSITIVITY.find((s) => s.slug === 'credentials').multiplier, 1.1);
});

test('Direct cost = records * perRecord * region * sensitivity', () => {
  const r = estimateBreachCost({
    records: 10000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 0, reported72h: false,
  });
  // 10000 * 244 * 1.0 * 1.0 = 2,440,000
  assert.equal(r.directCost, 2440000);
});

test('Reported within 72h gives a 10% reduction on direct cost', () => {
  const a = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 0, reported72h: false,
  });
  const b = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 0, reported72h: true,
  });
  assert.ok(Math.abs(b.directCost - a.directCost * 0.9) < 0.01);
});

test('GDPR fine is 4% of annual revenue', () => {
  const r = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'eu', sensitivity: 'pii',
    regulatory: 'gdpr', revenue: 50000000, reported72h: false,
  });
  assert.equal(r.regulatoryFine, 2000000);
});

test('CCPA fine is $7,500 per record', () => {
  const r = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'ccpa', revenue: 0, reported72h: false,
  });
  assert.equal(r.regulatoryFine, 7500000);
});

test('No regulatory regime means no fine', () => {
  const r = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 50000000, reported72h: false,
  });
  assert.equal(r.regulatoryFine, 0);
});

test('Total exposure is direct cost plus regulatory fine', () => {
  const r = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'ccpa', revenue: 0, reported72h: false,
  });
  assert.equal(r.total, r.directCost + r.regulatoryFine);
});

test('Range low is 0.7x and high is 1.3x of total', () => {
  const r = estimateBreachCost({
    records: 1000, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 0, reported72h: false,
  });
  assert.ok(Math.abs(r.low - r.total * 0.7) < 0.01);
  assert.ok(Math.abs(r.high - r.total * 1.3) < 0.01);
});

test('Per-record cost reflects multipliers', () => {
  const r = estimateBreachCost({
    records: 1000, sector: 'healthcare', region: 'uk', sensitivity: 'health',
    regulatory: 'none', revenue: 0, reported72h: false,
  });
  // 408 * 0.92 * 1.4 = 525.504
  assert.ok(Math.abs(r.perRecord - 525.504) < 0.01);
});

test('Negative records throws', () => {
  assert.throws(() => estimateBreachCost({
    records: -10, sector: 'tech', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 0, reported72h: false,
  }), /records/i);
});

test('Unknown sector throws', () => {
  assert.throws(() => estimateBreachCost({
    records: 100, sector: 'badminton', region: 'us', sensitivity: 'pii',
    regulatory: 'none', revenue: 0, reported72h: false,
  }), /sector/i);
});

test('Healthcare + EU + health PII + GDPR scenario', () => {
  const r = estimateBreachCost({
    records: 50000, sector: 'healthcare', region: 'eu', sensitivity: 'health',
    regulatory: 'gdpr', revenue: 100000000, reported72h: false,
  });
  // 50000 * 408 * 0.85 * 1.4 = 24,276,000
  assert.equal(r.directCost, 24276000);
  // 4% of 100m = 4m
  assert.equal(r.regulatoryFine, 4000000);
  assert.equal(r.total, 28276000);
});

test('REGULATORY export covers gdpr, ccpa, none', () => {
  const slugs = REGULATORY.map((r) => r.slug);
  assert.ok(slugs.includes('gdpr'));
  assert.ok(slugs.includes('ccpa'));
  assert.ok(slugs.includes('none'));
});
