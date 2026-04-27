'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./random-name-picker.js');

test('parseNames trims whitespace and drops empty lines', () => {
  const r = lib.parseNames('  Alice  \n\nBob\n   \nCarol\n');
  assert.deepEqual(r.names, ['Alice', 'Bob', 'Carol']);
  assert.equal(r.rawCount, 3);
  assert.equal(r.dedupedCount, 0);
});

test('parseNames removes exact duplicates and reports the count', () => {
  const r = lib.parseNames('Alice\nBob\nAlice\nCarol\nBob');
  assert.deepEqual(r.names, ['Alice', 'Bob', 'Carol']);
  assert.equal(r.rawCount, 5);
  assert.equal(r.dedupedCount, 2);
});

test('parseNames is case-sensitive (Alice and alice are distinct)', () => {
  const r = lib.parseNames('Alice\nalice');
  assert.deepEqual(r.names, ['Alice', 'alice']);
  assert.equal(r.dedupedCount, 0);
});

test('parseNames handles empty input', () => {
  const r = lib.parseNames('');
  assert.deepEqual(r.names, []);
  assert.equal(r.rawCount, 0);
  assert.equal(r.dedupedCount, 0);
});

test('parseNames handles whitespace-only input', () => {
  const r = lib.parseNames('   \n\n\t\n  ');
  assert.deepEqual(r.names, []);
});

test('validatePick rejects empty list', () => {
  const v = lib.validatePick([], 1, false);
  assert.equal(v.ok, false);
  assert.match(v.message, /at least one name/i);
});

test('validatePick rejects pick count below 1', () => {
  const v = lib.validatePick(['Alice'], 0, false);
  assert.equal(v.ok, false);
});

test('validatePick rejects non-integer pick count', () => {
  const v = lib.validatePick(['Alice', 'Bob'], 1.5, false);
  assert.equal(v.ok, false);
});

test('validatePick blocks count > list size when no duplicates', () => {
  const v = lib.validatePick(['Alice', 'Bob'], 3, false);
  assert.equal(v.ok, false);
  assert.match(v.message, /only have 2 names/);
});

test('validatePick allows count > list size when duplicates allowed', () => {
  const v = lib.validatePick(['Alice', 'Bob'], 5, true);
  assert.equal(v.ok, true);
});

test('pickNames single name pick 1 returns that name', () => {
  const out = lib.pickNames(['Alice'], 1, false);
  assert.deepEqual(out, ['Alice']);
});

test('pickNames without replacement returns unique entries', () => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  const out = lib.pickNames(names, 5, false);
  assert.equal(out.length, 5);
  const set = new Set(out);
  assert.equal(set.size, 5, 'all picks should be unique');
  // Every output should come from the input.
  out.forEach(n => assert.ok(names.includes(n)));
});

test('pickNames with replacement allows duplicates and exceeds list size', () => {
  // Only one name, ask for 10. Duplicates allowed, so we get 10 copies.
  const out = lib.pickNames(['Alice'], 10, true);
  assert.equal(out.length, 10);
  out.forEach(n => assert.equal(n, 'Alice'));
});

test('pickNames throws on invalid request', () => {
  assert.throws(() => lib.pickNames([], 1, false), /at least one name/);
  assert.throws(() => lib.pickNames(['Alice'], 2, false), /only have 1/);
});

test('pickNames uses injected randomInt deterministically', () => {
  // Force rnd to always return 0. Without replacement, the Fisher-Yates
  // partial shuffle with idx = k + 0 = k swaps each position with itself,
  // so the output is the input prefix in order.
  const names = ['Alice', 'Bob', 'Carol', 'Dave'];
  const out = lib.pickNames(names, 3, false, () => 0);
  assert.deepEqual(out, ['Alice', 'Bob', 'Carol']);
});

test('pickNames with replacement and rnd=0 always picks the first name', () => {
  const names = ['Alice', 'Bob', 'Carol'];
  const out = lib.pickNames(names, 4, true, () => 0);
  assert.deepEqual(out, ['Alice', 'Alice', 'Alice', 'Alice']);
});

test('bias check: 10000 picks across 5 names land within 20% of expected', () => {
  // Expected count per name = 10000 / 5 = 2000. Tolerance ±20% = [1600, 2400].
  const names = ['A', 'B', 'C', 'D', 'E'];
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const trials = 10000;
  for (let i = 0; i < trials; i++) {
    const pick = lib.pickNames(names, 1, true)[0];
    counts[pick]++;
  }
  const expected = trials / names.length;
  const lower = expected * 0.8;
  const upper = expected * 1.2;
  Object.keys(counts).forEach(k => {
    assert.ok(
      counts[k] >= lower && counts[k] <= upper,
      `${k}: got ${counts[k]}, expected within [${lower}, ${upper}]`
    );
  });
});

test('bias check (no duplicates): every name appears at least once over many shuffles', () => {
  // Pick 1 without replacement repeatedly. Each name should still come up.
  const names = ['A', 'B', 'C', 'D', 'E'];
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    seen.add(lib.pickNames(names, 1, false)[0]);
    if (seen.size === names.length) break;
  }
  assert.equal(seen.size, names.length);
});

test('defaultRandomInt produces values in [0, n) under Node webcrypto', () => {
  for (let i = 0; i < 200; i++) {
    const v = lib.defaultRandomInt(7);
    assert.ok(v >= 0 && v < 7 && Number.isInteger(v));
  }
});
