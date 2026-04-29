'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  factorial,
  combinations,
  permutations,
  combinationsWithRepetition,
  permutationsWithRepetition,
  multinomial,
  parseGroups,
  compute,
  formatBig,
  MAX_N,
} = require('./combinations-permutations.js');

test('factorial: small cases', () => {
  assert.equal(factorial(0), 1n);
  assert.equal(factorial(1), 1n);
  assert.equal(factorial(5), 120n);
  assert.equal(factorial(10), 3628800n);
});

test('factorial: rejects negatives', () => {
  assert.throws(() => factorial(-1));
});

test('factorial: BigInt for large n', () => {
  // 20! = 2432902008176640000
  assert.equal(factorial(20), 2432902008176640000n);
  // 25! does not fit in a double, but BigInt handles it cleanly.
  assert.equal(factorial(25), 15511210043330985984000000n);
});

test('combinations: standard cases', () => {
  assert.equal(combinations(5, 2), 10n);
  assert.equal(combinations(10, 3), 120n);
  assert.equal(combinations(52, 5), 2598960n); // poker hands
  assert.equal(combinations(7, 0), 1n);
  assert.equal(combinations(7, 7), 1n);
});

test('combinations: r > n returns 0', () => {
  assert.equal(combinations(3, 5), 0n);
});

test('permutations: standard cases', () => {
  assert.equal(permutations(5, 2), 20n);
  assert.equal(permutations(10, 3), 720n);
  assert.equal(permutations(7, 7), 5040n);
});

test('combinationsWithRepetition: stars and bars', () => {
  // C(n + r - 1, r). 5 ice-cream flavours, choose 3 scoops with repeats: C(7, 3) = 35.
  assert.equal(combinationsWithRepetition(5, 3), 35n);
  assert.equal(combinationsWithRepetition(3, 2), 6n);
});

test('permutationsWithRepetition: n^r', () => {
  assert.equal(permutationsWithRepetition(2, 4), 16n);
  assert.equal(permutationsWithRepetition(10, 3), 1000n);
});

test('multinomial: arrange MISSISSIPPI letters', () => {
  // 11! / (1! 4! 4! 2!) = 34650
  const m = multinomial([1, 4, 4, 2]);
  assert.equal(m.value, 34650n);
  assert.equal(m.n, 11n);
});

test('multinomial: trivial single group', () => {
  assert.equal(multinomial([5]).value, 1n);
});

test('parseGroups: handles whitespace and trailing commas', () => {
  assert.deepEqual(parseGroups('1, 4, 4, 2'), [1, 4, 4, 2]);
  assert.deepEqual(parseGroups('3,3,3,'), [3, 3, 3]);
});

test('parseGroups: rejects non-integers', () => {
  assert.throws(() => parseGroups('1, 2.5, 3'));
  assert.throws(() => parseGroups('1, hello, 3'));
});

test('compute: combinations mode default', () => {
  const r = compute({ mode: 'combinations', n: 5, r: 2 });
  assert.equal(r.nCr, 10n);
  assert.equal(r.factorialN, 120n);
  assert.equal(r.factorialR, 2n);
  assert.equal(r.factorialNminusR, 6n);
});

test('compute: both mode returns nCr and nPr', () => {
  const r = compute({ mode: 'both', n: 5, r: 3 });
  assert.equal(r.nCr, 10n);
  assert.equal(r.nPr, 60n);
});

test('compute: factorial-only mode does not need r', () => {
  const r = compute({ mode: 'factorial-only', n: 6 });
  assert.equal(r.factorialN, 720n);
});

test('compute: combinations with repetition flag', () => {
  const r = compute({ mode: 'combinations', n: 5, r: 3, repetition: true });
  assert.equal(r.nCr, 35n);
});

test('compute: permutations with repetition flag', () => {
  const r = compute({ mode: 'permutations', n: 2, r: 4, repetition: true });
  assert.equal(r.nPr, 16n);
});

test('compute: multinomial mode', () => {
  const r = compute({ mode: 'multinomial', multinomialGroups: '1,4,4,2' });
  assert.equal(r.multinomial, 34650n);
  assert.equal(r.n, 11);
});

test('compute: rejects r > n without repetition', () => {
  assert.throws(() => compute({ mode: 'combinations', n: 3, r: 5 }));
});

test('compute: allows r > n with repetition', () => {
  const r = compute({ mode: 'permutations', n: 2, r: 5, repetition: true });
  assert.equal(r.nPr, 32n);
});

test('compute: rejects n above MAX_N', () => {
  assert.throws(() => compute({ mode: 'combinations', n: MAX_N + 1, r: 1 }));
});

test('compute: rejects negative n', () => {
  assert.throws(() => compute({ mode: 'combinations', n: -1, r: 1 }));
});

test('compute: rejects non-integer n', () => {
  assert.throws(() => compute({ mode: 'combinations', n: 5.5, r: 2 }));
});

test('formatBig: thousands separators', () => {
  assert.equal(formatBig(1234567n), '1,234,567');
  assert.equal(formatBig(0n), '0');
});

test('formatBig: very large numbers get a scientific hint', () => {
  const s = formatBig(factorial(100));
  assert.match(s, /e\+/);
});
