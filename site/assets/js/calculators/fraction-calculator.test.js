const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  gcd,
  toImproper,
  toMixed,
  simplify,
  add,
  subtract,
  multiply,
  divide,
  calculate,
  formatFraction,
} = require('./fraction-calculator.js');

test('gcd: basic positives', () => {
  assert.equal(gcd(12, 8), 4);
  assert.equal(gcd(17, 5), 1);
  assert.equal(gcd(100, 25), 25);
});

test('gcd: handles zero', () => {
  assert.equal(gcd(0, 5), 5);
  assert.equal(gcd(7, 0), 7);
});

test('gcd: handles negatives', () => {
  assert.equal(gcd(-12, 8), 4);
  assert.equal(gcd(12, -8), 4);
});

test('toImproper: 1 1/2 = 3/2', () => {
  assert.deepEqual(toImproper({ whole: 1, numer: 1, denom: 2 }), { numer: 3, denom: 2 });
});

test('toImproper: 0 3/4 = 3/4', () => {
  assert.deepEqual(toImproper({ whole: 0, numer: 3, denom: 4 }), { numer: 3, denom: 4 });
});

test('toImproper: negative whole carries the sign', () => {
  // -1 1/2 means -(1 + 1/2) = -3/2
  assert.deepEqual(toImproper({ whole: -1, numer: 1, denom: 2 }), { numer: -3, denom: 2 });
});

test('toImproper: rejects denominator of zero', () => {
  assert.throws(() => toImproper({ whole: 0, numer: 1, denom: 0 }), /denominator/i);
});

test('toImproper: normalises a negative denominator onto the numerator', () => {
  assert.deepEqual(toImproper({ whole: 0, numer: 1, denom: -2 }), { numer: -1, denom: 2 });
});

test('toMixed: 5/3 = 1 2/3', () => {
  assert.deepEqual(toMixed({ numer: 5, denom: 3 }), { whole: 1, numer: 2, denom: 3, sign: 1 });
});

test('toMixed: -5/3 = -(1 2/3)', () => {
  assert.deepEqual(toMixed({ numer: -5, denom: 3 }), { whole: 1, numer: 2, denom: 3, sign: -1 });
});

test('toMixed: proper fraction stays proper', () => {
  assert.deepEqual(toMixed({ numer: 3, denom: 4 }), { whole: 0, numer: 3, denom: 4, sign: 1 });
});

test('toMixed: whole number (denom 1)', () => {
  assert.deepEqual(toMixed({ numer: 4, denom: 1 }), { whole: 4, numer: 0, denom: 1, sign: 1 });
});

test('toMixed: zero', () => {
  assert.deepEqual(toMixed({ numer: 0, denom: 5 }), { whole: 0, numer: 0, denom: 5, sign: 1 });
});

test('simplify: 6/8 = 3/4', () => {
  assert.deepEqual(simplify({ numer: 6, denom: 8 }), { numer: 3, denom: 4 });
});

test('simplify: already simplest form', () => {
  assert.deepEqual(simplify({ numer: 3, denom: 7 }), { numer: 3, denom: 7 });
});

test('simplify: zero numerator', () => {
  assert.deepEqual(simplify({ numer: 0, denom: 5 }), { numer: 0, denom: 1 });
});

test('simplify: negative numerator preserved, denominator stays positive', () => {
  assert.deepEqual(simplify({ numer: -6, denom: 8 }), { numer: -3, denom: 4 });
});

test('add: 1/2 + 1/3 = 5/6', () => {
  assert.deepEqual(add({ numer: 1, denom: 2 }, { numer: 1, denom: 3 }), { numer: 5, denom: 6 });
});

test('subtract: 3/4 - 1/2 = 1/4', () => {
  assert.deepEqual(subtract({ numer: 3, denom: 4 }, { numer: 1, denom: 2 }), { numer: 1, denom: 4 });
});

test('subtract: result of zero', () => {
  assert.deepEqual(subtract({ numer: 1, denom: 2 }, { numer: 1, denom: 2 }), { numer: 0, denom: 1 });
});

test('multiply: 2/3 * 3/4 = 1/2', () => {
  assert.deepEqual(multiply({ numer: 2, denom: 3 }, { numer: 3, denom: 4 }), { numer: 1, denom: 2 });
});

test('divide: 1/2 / 1/4 = 2/1', () => {
  assert.deepEqual(divide({ numer: 1, denom: 2 }, { numer: 1, denom: 4 }), { numer: 2, denom: 1 });
});

test('divide: refuses divide by zero (numerator zero on the divisor)', () => {
  assert.throws(() => divide({ numer: 1, denom: 2 }, { numer: 0, denom: 5 }), /divide by zero/i);
});

test('calculate: full pipeline, 1 1/2 + 2 1/3 = 3 5/6', () => {
  const result = calculate({
    a: { whole: 1, numer: 1, denom: 2 },
    b: { whole: 2, numer: 1, denom: 3 },
    op: '+',
  });
  assert.equal(result.simplified.numer, 23);
  assert.equal(result.simplified.denom, 6);
  assert.equal(result.mixed.sign, 1);
  assert.equal(result.mixed.whole, 3);
  assert.equal(result.mixed.numer, 5);
  assert.equal(result.mixed.denom, 6);
  // Decimal: 23/6 = 3.8333...
  assert.ok(Math.abs(result.decimal - 3.8333333) < 0.0001);
});

test('calculate: improper result is presented as a mixed number', () => {
  const result = calculate({
    a: { whole: 0, numer: 7, denom: 4 },
    b: { whole: 0, numer: 3, denom: 4 },
    op: '+',
  });
  // 7/4 + 3/4 = 10/4 = 5/2 = 2 1/2
  assert.deepEqual(result.simplified, { numer: 5, denom: 2 });
  assert.equal(result.mixed.whole, 2);
  assert.equal(result.mixed.numer, 1);
  assert.equal(result.mixed.denom, 2);
});

test('calculate: result that is a whole number (denom 1)', () => {
  const result = calculate({
    a: { whole: 0, numer: 1, denom: 2 },
    b: { whole: 0, numer: 1, denom: 2 },
    op: '+',
  });
  assert.deepEqual(result.simplified, { numer: 1, denom: 1 });
  assert.equal(result.mixed.whole, 1);
  assert.equal(result.mixed.numer, 0);
  assert.equal(result.decimal, 1);
});

test('calculate: negative fraction input', () => {
  // -1/2 + 1/4 = -1/4
  const result = calculate({
    a: { whole: 0, numer: -1, denom: 2 },
    b: { whole: 0, numer: 1, denom: 4 },
    op: '+',
  });
  assert.deepEqual(result.simplified, { numer: -1, denom: 4 });
  assert.equal(result.mixed.sign, -1);
});

test('calculate: division by zero fraction throws', () => {
  assert.throws(() => calculate({
    a: { whole: 0, numer: 1, denom: 2 },
    b: { whole: 0, numer: 0, denom: 5 },
    op: '/',
  }), /divide by zero/i);
});

test('calculate: zero denominator throws with helpful message', () => {
  assert.throws(() => calculate({
    a: { whole: 0, numer: 1, denom: 0 },
    b: { whole: 0, numer: 1, denom: 2 },
    op: '+',
  }), /denominator/i);
});

test('calculate: unknown operator throws', () => {
  assert.throws(() => calculate({
    a: { whole: 0, numer: 1, denom: 2 },
    b: { whole: 0, numer: 1, denom: 3 },
    op: '?',
  }), /operator/i);
});

test('formatFraction: proper fraction', () => {
  assert.equal(formatFraction({ numer: 3, denom: 4 }), '3/4');
});

test('formatFraction: whole number', () => {
  assert.equal(formatFraction({ numer: 5, denom: 1 }), '5');
});

test('formatFraction: zero', () => {
  assert.equal(formatFraction({ numer: 0, denom: 5 }), '0');
});

test('formatFraction: negative', () => {
  assert.equal(formatFraction({ numer: -3, denom: 4 }), '-3/4');
});
