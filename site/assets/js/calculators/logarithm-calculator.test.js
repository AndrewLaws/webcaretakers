'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  computeLog,
  resolveBase,
  formatNumber
} = require('./logarithm-calculator.js');

// --- resolveBase ------------------------------------------------------------

test('resolveBase: "10" returns 10', () => {
  assert.equal(resolveBase('10'), 10);
});

test('resolveBase: "2" returns 2', () => {
  assert.equal(resolveBase('2'), 2);
});

test('resolveBase: "e" returns Math.E', () => {
  assert.equal(resolveBase('e'), Math.E);
});

test('resolveBase: "custom" reads custom argument', () => {
  assert.equal(resolveBase('custom', 7), 7);
});

// --- computeLog: log mode ---------------------------------------------------

test('log10(1000) = 3', () => {
  const r = computeLog({ mode: 'log', value: 1000, base: 10 });
  assert.equal(r.kind, 'ok');
  assert.ok(Math.abs(r.result - 3) < 1e-12);
});

test('log2(8) = 3', () => {
  const r = computeLog({ mode: 'log', value: 8, base: 2 });
  assert.ok(Math.abs(r.result - 3) < 1e-12);
});

test('ln(e) = 1', () => {
  const r = computeLog({ mode: 'log', value: Math.E, base: Math.E });
  assert.ok(Math.abs(r.result - 1) < 1e-12);
});

test('log5(25) = 2', () => {
  const r = computeLog({ mode: 'log', value: 25, base: 5 });
  assert.ok(Math.abs(r.result - 2) < 1e-12);
});

test('log mode rejects non-positive value', () => {
  const r = computeLog({ mode: 'log', value: -5, base: 10 });
  assert.equal(r.kind, 'invalid');
  assert.match(r.error, /positive/i);
});

test('log mode rejects zero value', () => {
  const r = computeLog({ mode: 'log', value: 0, base: 10 });
  assert.equal(r.kind, 'invalid');
});

test('log mode rejects base <= 0', () => {
  const r = computeLog({ mode: 'log', value: 100, base: 0 });
  assert.equal(r.kind, 'invalid');
});

test('log mode rejects base = 1', () => {
  const r = computeLog({ mode: 'log', value: 100, base: 1 });
  assert.equal(r.kind, 'invalid');
});

test('log mode result includes inverse b^result', () => {
  const r = computeLog({ mode: 'log', value: 1000, base: 10 });
  assert.ok(Math.abs(r.inverse - 1000) < 1e-9);
});

// --- computeLog: value mode (solve for x) -----------------------------------

test('value mode: base 2, result 5 -> x = 32', () => {
  const r = computeLog({ mode: 'value', logResult: 5, base: 2 });
  assert.equal(r.kind, 'ok');
  assert.ok(Math.abs(r.result - 32) < 1e-9);
});

test('value mode: base 10, result 0 -> x = 1', () => {
  const r = computeLog({ mode: 'value', logResult: 0, base: 10 });
  assert.ok(Math.abs(r.result - 1) < 1e-12);
});

// --- computeLog: base mode (solve for base) ---------------------------------

test('base mode: value 1000, result 3 -> base = 10', () => {
  const r = computeLog({ mode: 'base', value: 1000, logResult: 3 });
  assert.equal(r.kind, 'ok');
  assert.ok(Math.abs(r.result - 10) < 1e-9);
});

test('base mode: value 32, result 5 -> base = 2', () => {
  const r = computeLog({ mode: 'base', value: 32, logResult: 5 });
  assert.ok(Math.abs(r.result - 2) < 1e-9);
});

test('base mode rejects logResult of zero', () => {
  const r = computeLog({ mode: 'base', value: 100, logResult: 0 });
  assert.equal(r.kind, 'invalid');
});

// --- formatNumber -----------------------------------------------------------

test('formatNumber returns clean integer when whole', () => {
  assert.equal(formatNumber(3), '3');
});

test('formatNumber returns high-precision decimal otherwise', () => {
  const s = formatNumber(Math.LN2);
  assert.ok(s.length > 4);
});
