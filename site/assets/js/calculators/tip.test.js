'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateTip } = require('./tip.js');

test('basic 18% tip on $100', () => {
  const r = calculateTip({ billTotal: 100, tipPercent: 18 });
  assert.equal(r.tipAmount, 18);
  assert.equal(r.totalWithTip, 118);
  assert.equal(r.perPersonTotal, 118);
});

test('split between 4 people', () => {
  const r = calculateTip({ billTotal: 120, tipPercent: 20, splitBetween: 4 });
  assert.equal(r.tipAmount, 24);
  assert.equal(r.totalWithTip, 144);
  assert.equal(r.perPersonTotal, 36);
  assert.equal(r.perPersonBase, 30);
});

test('zero tip is allowed', () => {
  const r = calculateTip({ billTotal: 50, tipPercent: 0 });
  assert.equal(r.tipAmount, 0);
  assert.equal(r.totalWithTip, 50);
});

test('default tip is 18 and default split is 1', () => {
  const r = calculateTip({ billTotal: 100 });
  assert.equal(r.tipPercent, 18);
  assert.equal(r.splitBetween, 1);
});

test('awkward division: $100, 15%, 3 ways', () => {
  const r = calculateTip({ billTotal: 100, tipPercent: 15, splitBetween: 3 });
  assert.equal(r.tipAmount, 15);
  assert.equal(r.totalWithTip, 115);
  // 115 / 3 = 38.333... → 38.33
  assert.equal(r.perPersonTotal, 38.33);
});

test('round-up makes per-person a whole unit and reconciles tip', () => {
  // $50 bill, 20% tip = $60, split 4 = $15 each. Already whole, no change.
  const r1 = calculateTip({ billTotal: 50, tipPercent: 20, splitBetween: 4, roundUp: true });
  assert.equal(r1.perPersonTotal, 15);
  assert.equal(r1.totalWithTip, 60);

  // $23.50 bill, 18% tip = $27.73, split 3 = $9.24333 → rounds up to $10 each = $30 total
  const r2 = calculateTip({ billTotal: 23.50, tipPercent: 18, splitBetween: 3, roundUp: true });
  assert.equal(r2.perPersonTotal, 10);
  assert.equal(r2.totalWithTip, 30);
  assert.equal(r2.tipAmount, 6.5);  // 30 - 23.50
});

test('throws on negative bill', () => {
  assert.throws(() => calculateTip({ billTotal: -10, tipPercent: 18 }));
});

test('throws on negative tip', () => {
  assert.throws(() => calculateTip({ billTotal: 100, tipPercent: -5 }));
});

test('throws on split < 1', () => {
  assert.throws(() => calculateTip({ billTotal: 100, tipPercent: 18, splitBetween: 0 }));
});

test('throws on missing bill', () => {
  assert.throws(() => calculateTip({}));
});

test('accepts zero bill', () => {
  const r = calculateTip({ billTotal: 0, tipPercent: 18 });
  assert.equal(r.totalWithTip, 0);
  assert.equal(r.perPersonTotal, 0);
});

test('common US restaurant scenario: $85.50, 20%, split 2', () => {
  const r = calculateTip({ billTotal: 85.50, tipPercent: 20, splitBetween: 2 });
  assert.equal(r.tipAmount, 17.1);
  assert.equal(r.totalWithTip, 102.6);
  assert.equal(r.perPersonTotal, 51.3);
});
