'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./magic-8-ball.js');

test('exposes exactly 20 canonical answers', () => {
  assert.equal(lib.ANSWERS.length, 20);
});

test('split is 10 affirmative, 5 non-committal, 5 negative', () => {
  const counts = { Affirmative: 0, 'Non-committal': 0, Negative: 0 };
  lib.ANSWERS.forEach(a => { counts[a.category]++; });
  assert.equal(counts.Affirmative, 10);
  assert.equal(counts['Non-committal'], 5);
  assert.equal(counts.Negative, 5);
});

test('every answer has a non-empty text and a valid category', () => {
  const valid = new Set(['Affirmative', 'Non-committal', 'Negative']);
  lib.ANSWERS.forEach(a => {
    assert.ok(typeof a.text === 'string' && a.text.length > 0);
    assert.ok(valid.has(a.category));
  });
});

test('answer texts are unique (canonical Mattel set, no duplicates)', () => {
  const texts = lib.ANSWERS.map(a => a.text);
  assert.equal(new Set(texts).size, 20);
});

test('getAnswer returns one of the 20 canonical answers', () => {
  for (let i = 0; i < 50; i++) {
    const a = lib.getAnswer();
    assert.ok(lib.ANSWERS.includes(a), 'returned answer must be one of the canonical 20');
  }
});

test('getAnswer uses injected randomInt deterministically (index 0 = first answer)', () => {
  const a = lib.getAnswer(() => 0);
  assert.equal(a, lib.ANSWERS[0]);
});

test('getAnswer with injected randomInt selects every index correctly', () => {
  for (let i = 0; i < 20; i++) {
    const a = lib.getAnswer(() => i);
    assert.equal(a, lib.ANSWERS[i]);
  }
});

test('rngFromCryptoLike consumes crypto.getRandomValues and rejects above the cutoff', () => {
  // n = 20, max = 0xFFFFFFFF, (max+1) % 20 = 0, so limit = max. Use n = 7 to test rejection.
  // For n = 7: (max+1) % 7 = 4, so limit = 0xFFFFFFFF - 4 = 0xFFFFFFFB.
  // First buffer value 0xFFFFFFFD (above limit) must be rejected, then 5 must be accepted -> 5 % 7 = 5.
  const sequence = [0xFFFFFFFD, 5];
  let calls = 0;
  const fakeCrypto = {
    getRandomValues: function (buf) {
      buf[0] = sequence[calls++];
      return buf;
    }
  };
  const rng = lib.rngFromCryptoLike(fakeCrypto);
  assert.equal(rng(7), 5);
  assert.equal(calls, 2, 'first sample rejected, second accepted');
});

test('rngFromCryptoLike: limit value selects a valid index for n = 20', () => {
  // For n = 20, (max+1) % 20 = (2^32) % 20 = 16, so limit = 0xFFFFFFFF - 16 = 0xFFFFFFEF.
  // 0xFFFFFFEF is therefore NOT rejected, and 0xFFFFFFEF % 20 = 19 (a valid index).
  const fakeCrypto = {
    getRandomValues: function (buf) { buf[0] = 0xFFFFFFEF; return buf; }
  };
  const rng = lib.rngFromCryptoLike(fakeCrypto);
  const idx = rng(20);
  assert.ok(Number.isInteger(idx) && idx >= 0 && idx < 20);
  assert.equal(idx, 0xFFFFFFEF % 20);
});

test('rngFromCryptoLike rejects 0xFFFFFFFF for n = 7 (above limit) then accepts next value', () => {
  // n = 7: limit = 0xFFFFFFFB. 0xFFFFFFFF must be rejected.
  const seq = [0xFFFFFFFF, 0];
  let calls = 0;
  const fakeCrypto = {
    getRandomValues: function (buf) { buf[0] = seq[calls++]; return buf; }
  };
  const rng = lib.rngFromCryptoLike(fakeCrypto);
  assert.equal(rng(7), 0);
  assert.equal(calls, 2);
});

test('getAnswer with rng returning max-equivalent (19) returns the 20th answer', () => {
  const a = lib.getAnswer(() => 19);
  assert.equal(a, lib.ANSWERS[19]);
});

test('categoriseCount matches the canonical 10/5/5 split as a function call', () => {
  const c = lib.categoryCounts();
  assert.deepEqual(c, { Affirmative: 10, 'Non-committal': 5, Negative: 5 });
});
