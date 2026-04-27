'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MODELS,
  PRICING_LAST_VERIFIED,
  costForBatch,
  projectUsage,
  modelComparison,
} = require('./ai-image-generation-cost.js');

// ── costForBatch ──────────────────────────────────────────────────────────

test('costForBatch: zero images cost nothing', () => {
  const r = costForBatch({ model: { perImage: 0.04 }, images: 0 });
  assert.equal(r.total, 0);
});

test('costForBatch: scales linearly', () => {
  const r = costForBatch({ model: { perImage: 0.04 }, images: 100 });
  assert.equal(r.total, 4);
  assert.equal(r.perImage, 0.04);
});

test('costForBatch: rejects negative images and missing perImage', () => {
  assert.throws(() => costForBatch({ model: { perImage: 0.04 }, images: -1 }));
  assert.throws(() => costForBatch({ model: {}, images: 1 }));
});

// ── projectUsage ──────────────────────────────────────────────────────────

test('projectUsage: monthly and annual scale together', () => {
  const p = projectUsage({ perImage: 0.04, imagesPerMonth: 1000 });
  assert.equal(p.monthly, 40);
  assert.equal(p.annual, 480);
});

test('projectUsage: zero volume is zero everywhere', () => {
  const p = projectUsage({ perImage: 0.05, imagesPerMonth: 0 });
  assert.equal(p.monthly, 0);
  assert.equal(p.annual, 0);
});

test('projectUsage: rejects negative inputs', () => {
  assert.throws(() => projectUsage({ perImage: -1, imagesPerMonth: 1 }));
  assert.throws(() => projectUsage({ perImage: 1, imagesPerMonth: -1 }));
});

// ── modelComparison ───────────────────────────────────────────────────────

test('modelComparison: returns one row per supplied model, sorted cheapest first', () => {
  const models = [
    { id: 'a', name: 'A', vendor: 'X', perImage: 0.10 },
    { id: 'b', name: 'B', vendor: 'Y', perImage: 0.01 },
    { id: 'c', name: 'C', vendor: 'Z', perImage: 0.05 },
  ];
  const rows = modelComparison({ imagesPerMonth: 1000, models });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].id, 'b'); // cheapest
  assert.equal(rows[2].id, 'a'); // most expensive
  rows.forEach(r => {
    assert.ok(typeof r.monthly === 'number');
    assert.ok(typeof r.annual === 'number');
    assert.ok(typeof r.perImage === 'number');
  });
});

test('modelComparison: defaults to baked-in MODELS list', () => {
  const rows = modelComparison({ imagesPerMonth: 1000 });
  assert.equal(rows.length, MODELS.length);
  assert.ok(rows.length >= 4, 'should expose at least four image models');
});

test('modelComparison: SDXL is the cheapest of the baked-in models', () => {
  const rows = modelComparison({ imagesPerMonth: 1000 });
  assert.equal(rows[0].id, 'sdxl-replicate');
});

test('modelComparison: DALL-E 3 HD is the most expensive of the baked-in models', () => {
  // DALL-E 3 HD at $0.080/img tops the list, narrowly beating Flux Pro at $0.055.
  const rows = modelComparison({ imagesPerMonth: 1000 });
  assert.equal(rows[rows.length - 1].id, 'dalle-3-hd');
});

// ── Pricing sanity ────────────────────────────────────────────────────────

test('every baked-in model has plausible non-zero pricing', () => {
  MODELS.forEach(m => {
    assert.ok(m.id && typeof m.id === 'string', `${m.name} missing id`);
    assert.ok(m.name && typeof m.name === 'string', `${m.id} missing name`);
    assert.ok(m.vendor, `${m.id} missing vendor`);
    assert.ok(m.perImage > 0, `${m.id} perImage must be positive`);
    // Sanity: no model should be charging more than $1/image at list price.
    assert.ok(m.perImage < 1, `${m.id} perImage looks like a typo (>= $1)`);
  });
});

test('PRICING_LAST_VERIFIED is an ISO date string', () => {
  assert.match(PRICING_LAST_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
});

test('vendor coverage includes OpenAI, Midjourney, Replicate and Google', () => {
  const vendors = new Set(MODELS.map(m => m.vendor));
  assert.ok(vendors.has('OpenAI'));
  assert.ok(vendors.has('Midjourney'));
  assert.ok(vendors.has('Replicate'));
  assert.ok(vendors.has('Google'));
});

test('DALL-E 3 standard is half the price of HD', () => {
  const std = MODELS.find(m => m.id === 'dalle-3-standard');
  const hd = MODELS.find(m => m.id === 'dalle-3-hd');
  assert.equal(std.perImage * 2, hd.perImage);
});
