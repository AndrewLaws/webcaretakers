'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseIntegers,
  gcd,
  gcdMany,
  lcm,
  lcmMany,
  primeFactorise,
  euclideanSteps,
  combinedFactorisation,
  compute,
} = require('./gcd-lcm-calculator.js');

// --- parseIntegers --------------------------------------------------------

test('parseIntegers: empty string returns empty values', () => {
  assert.deepEqual(parseIntegers(''), { values: [], invalid: [] });
});

test('parseIntegers: null and undefined are tolerated', () => {
  assert.deepEqual(parseIntegers(null), { values: [], invalid: [] });
  assert.deepEqual(parseIntegers(undefined), { values: [], invalid: [] });
});

test('parseIntegers: comma, space, semicolon, newline all work', () => {
  assert.deepEqual(parseIntegers('12, 18; 30\n45 60').values, [12, 18, 30, 45, 60]);
});

test('parseIntegers: rejects decimals', () => {
  const r = parseIntegers('12, 3.5, 18');
  assert.deepEqual(r.values, [12, 18]);
  assert.deepEqual(r.invalid, ['3.5']);
});

test('parseIntegers: rejects negatives', () => {
  const r = parseIntegers('12, -6, 18');
  assert.deepEqual(r.values, [12, 18]);
  assert.deepEqual(r.invalid, ['-6']);
});

test('parseIntegers: rejects zero', () => {
  const r = parseIntegers('0, 12');
  assert.deepEqual(r.values, [12]);
  assert.deepEqual(r.invalid, ['0']);
});

test('parseIntegers: rejects non-numeric tokens', () => {
  const r = parseIntegers('12, foo, 18');
  assert.deepEqual(r.values, [12, 18]);
  assert.deepEqual(r.invalid, ['foo']);
});

// --- gcd / gcdMany / lcm / lcmMany ---------------------------------------

test('gcd: basic pairs', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(48, 36), 12);
  assert.equal(gcd(17, 13), 1); // coprime
  assert.equal(gcd(20, 5), 5);  // one divides the other
});

test('gcd: order-independent', () => {
  assert.equal(gcd(18, 12), 6);
  assert.equal(gcd(12, 18), 6);
});

test('gcd: gcd(n, n) = n', () => {
  assert.equal(gcd(7, 7), 7);
});

test('gcdMany: three or more inputs', () => {
  assert.equal(gcdMany([12, 18, 24]), 6);
  assert.equal(gcdMany([100, 75, 50, 25]), 25);
});

test('gcdMany: coprime triple', () => {
  assert.equal(gcdMany([7, 11, 13]), 1);
});

test('gcdMany: identical numbers', () => {
  assert.equal(gcdMany([8, 8, 8]), 8);
});

test('lcm: basic pairs', () => {
  assert.equal(lcm(4, 6), 12);
  assert.equal(lcm(12, 18), 36);
  assert.equal(lcm(7, 5), 35); // coprime: product
});

test('lcm: one divides the other', () => {
  assert.equal(lcm(5, 20), 20);
});

test('lcmMany: three or more inputs', () => {
  assert.equal(lcmMany([4, 6, 8]), 24);
  assert.equal(lcmMany([2, 3, 5, 7]), 210);
});

test('lcmMany: identical numbers', () => {
  assert.equal(lcmMany([8, 8, 8]), 8);
});

// --- primeFactorise -------------------------------------------------------

test('primeFactorise: 12 = 2^2 * 3', () => {
  assert.deepEqual(primeFactorise(12), [{ prime: 2, power: 2 }, { prime: 3, power: 1 }]);
});

test('primeFactorise: 1 returns empty', () => {
  assert.deepEqual(primeFactorise(1), []);
});

test('primeFactorise: prime returns itself', () => {
  assert.deepEqual(primeFactorise(7), [{ prime: 7, power: 1 }]);
  assert.deepEqual(primeFactorise(999983), [{ prime: 999983, power: 1 }]);
});

test('primeFactorise: power of 2', () => {
  assert.deepEqual(primeFactorise(1024), [{ prime: 2, power: 10 }]);
});

test('primeFactorise: 360 = 2^3 * 3^2 * 5', () => {
  assert.deepEqual(primeFactorise(360), [
    { prime: 2, power: 3 },
    { prime: 3, power: 2 },
    { prime: 5, power: 1 },
  ]);
});

// --- euclideanSteps -------------------------------------------------------

test('euclideanSteps: gcd(48, 18)', () => {
  const steps = euclideanSteps(48, 18);
  // 48 = 2*18 + 12 -> gcd(18,12); 18 = 1*12 + 6 -> gcd(12,6); 12 = 2*6 + 0
  assert.equal(steps[0].a, 48);
  assert.equal(steps[0].b, 18);
  assert.equal(steps[0].quotient, 2);
  assert.equal(steps[0].remainder, 12);
  assert.equal(steps[steps.length - 1].b, 0);
});

test('euclideanSteps: gcd(a, a) terminates', () => {
  const steps = euclideanSteps(7, 7);
  // 7 = 1*7 + 0 -> gcd(7, 0) = 7
  assert.equal(steps[steps.length - 1].b, 0);
  assert.equal(steps[steps.length - 1].a, 7);
});

// --- combinedFactorisation -----------------------------------------------

test('combinedFactorisation: highest prime powers across inputs', () => {
  // 12 = 2^2 * 3, 18 = 2 * 3^2 -> LCM uses 2^2, 3^2, GCD uses 2^1, 3^1
  const cf = combinedFactorisation([12, 18]);
  const primes = cf.map(p => p.prime);
  assert.deepEqual(primes, [2, 3]);
  const two = cf.find(p => p.prime === 2);
  const three = cf.find(p => p.prime === 3);
  assert.equal(two.maxPower, 2);
  assert.equal(two.minPower, 1);
  assert.equal(three.maxPower, 2);
  assert.equal(three.minPower, 1);
});

test('combinedFactorisation: prime missing from one input gives minPower 0', () => {
  // 4 = 2^2, 9 = 3^2 -> coprime
  const cf = combinedFactorisation([4, 9]);
  const two = cf.find(p => p.prime === 2);
  const three = cf.find(p => p.prime === 3);
  assert.equal(two.minPower, 0);
  assert.equal(two.maxPower, 2);
  assert.equal(three.minPower, 0);
  assert.equal(three.maxPower, 2);
});

// --- compute (top level) -------------------------------------------------

test('compute: rejects single input', () => {
  const r = compute([12]);
  assert.equal(r.ok, false);
  assert.match(r.error, /at least two/i);
});

test('compute: rejects empty input', () => {
  const r = compute([]);
  assert.equal(r.ok, false);
});

test('compute: classic 12 and 18', () => {
  const r = compute([12, 18]);
  assert.equal(r.ok, true);
  assert.equal(r.gcd, 6);
  assert.equal(r.lcm, 36);
  assert.equal(r.factorisations.length, 2);
});

test('compute: coprime pair gcd 1, lcm product', () => {
  const r = compute([7, 11]);
  assert.equal(r.gcd, 1);
  assert.equal(r.lcm, 77);
});

test('compute: one divides the other', () => {
  const r = compute([5, 20]);
  assert.equal(r.gcd, 5);
  assert.equal(r.lcm, 20);
});

test('compute: three identical numbers', () => {
  const r = compute([6, 6, 6]);
  assert.equal(r.gcd, 6);
  assert.equal(r.lcm, 6);
});

test('compute: three or more inputs', () => {
  const r = compute([12, 18, 24]);
  assert.equal(r.gcd, 6);
  assert.equal(r.lcm, 72);
});

test('compute: large primes coprime', () => {
  const r = compute([999983, 999979]);
  assert.equal(r.ok, true);
  assert.equal(r.gcd, 1);
  assert.equal(r.lcm, 999983 * 999979);
  assert.deepEqual(r.factorisations[0].factors, [{ prime: 999983, power: 1 }]);
  assert.deepEqual(r.factorisations[1].factors, [{ prime: 999979, power: 1 }]);
});

test('compute: powers of 2', () => {
  const r = compute([8, 16, 32]);
  assert.equal(r.gcd, 8);
  assert.equal(r.lcm, 32);
});

test('compute: rejects values above max', () => {
  const r = compute([1, 1e13]);
  assert.equal(r.ok, false);
  assert.match(r.error, /too large/i);
});

test('compute: rejects more than 10 inputs', () => {
  const many = [];
  for (let i = 1; i <= 11; i++) many.push(i + 1);
  const r = compute(many);
  assert.equal(r.ok, false);
  assert.match(r.error, /no more than 10/i);
});

test('compute: euclidean steps included for two inputs', () => {
  const r = compute([48, 18]);
  assert.ok(Array.isArray(r.euclideanSteps));
  assert.ok(r.euclideanSteps.length >= 1);
});

test('compute: pairwise reduction trail for 3+ inputs', () => {
  const r = compute([12, 18, 24]);
  assert.ok(Array.isArray(r.pairwiseGcd));
  // Two pairwise reductions to combine three numbers.
  assert.equal(r.pairwiseGcd.length, 2);
});
