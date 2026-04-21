'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateWeddingBudget } = require('./wedding-budget.js');

function approx(actual, expected, tolerance) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

// ── Structure ─────────────────────────────────────────────────────────────

test('returns object with categories array, perHeadCost, totalBudget, guestCount', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  assert.equal(r.totalBudget, 20000);
  assert.equal(r.guestCount, 100);
  assert.ok(typeof r.perHeadCost === 'number');
  assert.ok(Array.isArray(r.categories));
});

test('returns 9 categories', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  assert.equal(r.categories.length, 9);
});

test('each category has id, name, percentage, amount', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  for (const c of r.categories) {
    assert.ok(typeof c.id === 'string' && c.id.length > 0, `missing id: ${JSON.stringify(c)}`);
    assert.ok(typeof c.name === 'string' && c.name.length > 0, `missing name on ${c.id}`);
    assert.ok(typeof c.percentage === 'number' && c.percentage > 0, `bad percentage on ${c.id}`);
    assert.ok(typeof c.amount === 'number' && c.amount > 0, `bad amount on ${c.id}`);
  }
});

// ── Percentages ───────────────────────────────────────────────────────────

test('category percentages sum to 100', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  const total = r.categories.reduce((sum, c) => sum + c.percentage, 0);
  assert.equal(total, 100);
});

test('venue is 30% of budget', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  const venue = r.categories.find(c => c.id === 'venue');
  assert.ok(venue, 'venue category not found');
  assert.equal(venue.percentage, 30);
  approx(venue.amount, 6000, 1);
});

test('catering is 35% of budget', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  const cat = r.categories.find(c => c.id === 'catering');
  assert.ok(cat, 'catering category not found');
  assert.equal(cat.percentage, 35);
  approx(cat.amount, 7000, 1);
});

// ── Amounts ───────────────────────────────────────────────────────────────

test('category amounts sum to totalBudget (within £1 rounding)', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  const total = r.categories.reduce((sum, c) => sum + c.amount, 0);
  approx(total, 20000, 1);
});

test('category amounts scale with totalBudget', () => {
  const r1 = calculateWeddingBudget({ totalBudget: 10000, guestCount: 50 });
  const r2 = calculateWeddingBudget({ totalBudget: 20000, guestCount: 50 });
  const venue1 = r1.categories.find(c => c.id === 'venue').amount;
  const venue2 = r2.categories.find(c => c.id === 'venue').amount;
  approx(venue2, venue1 * 2, 1);
});

// ── Per-head cost ─────────────────────────────────────────────────────────

test('perHeadCost = totalBudget / guestCount', () => {
  const r = calculateWeddingBudget({ totalBudget: 15000, guestCount: 75 });
  approx(r.perHeadCost, 200, 0.01);
});

test('perHeadCost scales correctly with guestCount', () => {
  const r1 = calculateWeddingBudget({ totalBudget: 20000, guestCount: 50 });
  const r2 = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  approx(r1.perHeadCost, r2.perHeadCost * 2, 0.01);
});

// ── Expected category IDs present ────────────────────────────────────────

test('all expected category IDs are present', () => {
  const r = calculateWeddingBudget({ totalBudget: 20000, guestCount: 100 });
  const ids = r.categories.map(c => c.id);
  const required = ['venue', 'catering', 'photography', 'music', 'flowers', 'attire', 'stationery', 'transport', 'contingency'];
  for (const id of required) {
    assert.ok(ids.includes(id), `missing category: ${id}`);
  }
});

// ── Validation ────────────────────────────────────────────────────────────

test('rejects zero totalBudget', () => {
  assert.throws(() => calculateWeddingBudget({ totalBudget: 0, guestCount: 100 }), /totalBudget/);
});

test('rejects negative totalBudget', () => {
  assert.throws(() => calculateWeddingBudget({ totalBudget: -1000, guestCount: 100 }), /totalBudget/);
});

test('rejects zero guestCount', () => {
  assert.throws(() => calculateWeddingBudget({ totalBudget: 20000, guestCount: 0 }), /guestCount/);
});

test('rejects guestCount of 1', () => {
  assert.throws(() => calculateWeddingBudget({ totalBudget: 20000, guestCount: 1 }), /guestCount/);
});
