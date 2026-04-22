'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateVAT } = require('./uk-vat.js');

test('adds 20% VAT to net amount', () => {
  const r = calculateVAT({ amount: 100, rate: 20, direction: 'add' });
  assert.equal(r.net,   100);
  assert.equal(r.vat,    20);
  assert.equal(r.gross, 120);
});

test('removes 20% VAT from gross amount', () => {
  const r = calculateVAT({ amount: 120, rate: 20, direction: 'remove' });
  assert.equal(r.gross, 120);
  assert.equal(r.net,   100);
  assert.equal(r.vat,    20);
});

test('adds 5% reduced rate', () => {
  const r = calculateVAT({ amount: 200, rate: 5, direction: 'add' });
  assert.equal(r.net,   200);
  assert.equal(r.vat,    10);
  assert.equal(r.gross, 210);
});

test('removes 5% reduced rate', () => {
  const r = calculateVAT({ amount: 210, rate: 5, direction: 'remove' });
  assert.equal(r.gross, 210);
  assert.equal(r.net,   200);
  assert.equal(r.vat,    10);
});

test('zero rate returns no VAT', () => {
  const r = calculateVAT({ amount: 100, rate: 0, direction: 'add' });
  assert.equal(r.vat,   0);
  assert.equal(r.gross, 100);
});

test('rounds VAT to 2 decimal places — add direction', () => {
  const r = calculateVAT({ amount: 99.99, rate: 20, direction: 'add' });
  assert.equal(r.gross, 119.99);
  assert.equal(r.vat,    20);
});

test('rounds net to 2 decimal places — remove direction', () => {
  // 100 / 1.2 = 83.3333… → 83.33
  const r = calculateVAT({ amount: 100, rate: 20, direction: 'remove' });
  assert.equal(r.net, 83.33);
  assert.equal(r.vat, 16.67);
});

test('handles zero amount', () => {
  const r = calculateVAT({ amount: 0, rate: 20, direction: 'add' });
  assert.equal(r.net,   0);
  assert.equal(r.vat,   0);
  assert.equal(r.gross, 0);
});

test('returns rateName Standard rate for 20%', () => {
  const r = calculateVAT({ amount: 100, rate: 20, direction: 'add' });
  assert.ok(r.rateName.includes('Standard'));
});

test('returns rateName Reduced rate for 5%', () => {
  const r = calculateVAT({ amount: 100, rate: 5, direction: 'add' });
  assert.ok(r.rateName.includes('Reduced'));
});

test('returns rateName Zero rate for 0%', () => {
  const r = calculateVAT({ amount: 100, rate: 0, direction: 'add' });
  assert.ok(r.rateName.includes('Zero'));
});

test('throws on negative amount', () => {
  assert.throws(() => calculateVAT({ amount: -1, rate: 20, direction: 'add' }), /non-negative/);
});

test('throws on invalid rate', () => {
  assert.throws(() => calculateVAT({ amount: 100, rate: 15, direction: 'add' }), /rate must be/);
});

test('throws on invalid direction', () => {
  assert.throws(() => calculateVAT({ amount: 100, rate: 20, direction: 'multiply' }), /direction must be/);
});
