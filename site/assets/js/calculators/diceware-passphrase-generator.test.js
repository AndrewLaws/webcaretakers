'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  WORDLIST,
  ENTROPY_PER_WORD,
  entropyBits,
  applyCapitalisation,
  renderPassphrase,
  resistanceSummary,
  unbiasedRandomIndex,
} = require('./diceware-passphrase-generator.js');

// --- wordlist -------------------------------------------------------------

test('WORDLIST has exactly 1296 entries', () => {
  assert.equal(Array.isArray(WORDLIST), true);
  assert.equal(WORDLIST.length, 1296);
});

test('WORDLIST entries are non-empty lowercase strings', () => {
  for (var i = 0; i < WORDLIST.length; i++) {
    assert.equal(typeof WORDLIST[i], 'string');
    assert.equal(WORDLIST[i].length > 0, true, 'empty word at index ' + i);
    assert.equal(WORDLIST[i], WORDLIST[i].toLowerCase());
  }
});

test('WORDLIST contains known EFF short list anchors', () => {
  // First word in the EFF short list is "acid", last is "zoom".
  assert.equal(WORDLIST[0], 'acid');
  assert.equal(WORDLIST[WORDLIST.length - 1], 'zoom');
});

// --- entropy --------------------------------------------------------------

test('ENTROPY_PER_WORD equals log2(1296)', () => {
  assert.ok(Math.abs(ENTROPY_PER_WORD - Math.log2(1296)) < 1e-12);
});

test('entropyBits: 6 words is approximately 62 bits', () => {
  var bits = entropyBits(6);
  assert.ok(Math.abs(bits - 6 * Math.log2(1296)) < 1e-12);
  assert.ok(bits > 62 && bits < 63);
});

test('entropyBits: scales linearly with word count', () => {
  assert.ok(Math.abs(entropyBits(3) - 3 * ENTROPY_PER_WORD) < 1e-12);
  assert.ok(Math.abs(entropyBits(10) - 10 * ENTROPY_PER_WORD) < 1e-12);
});

// --- capitalisation -------------------------------------------------------

test('applyCapitalisation: none leaves words untouched', () => {
  assert.deepEqual(
    applyCapitalisation(['acid', 'acorn', 'acre'], 'none', function () { return 0; }),
    ['acid', 'acorn', 'acre']
  );
});

test('applyCapitalisation: first uppercases the leading letter of each word', () => {
  assert.deepEqual(
    applyCapitalisation(['acid', 'acorn', 'acre'], 'first', function () { return 0; }),
    ['Acid', 'Acorn', 'Acre']
  );
});

test('applyCapitalisation: random uses provided picker to choose one word', () => {
  // Force the picker to always pick index 1.
  var out = applyCapitalisation(['acid', 'acorn', 'acre'], 'random', function () { return 1; });
  assert.deepEqual(out, ['acid', 'Acorn', 'acre']);
});

// --- separator rendering --------------------------------------------------

test('renderPassphrase: space separator', () => {
  assert.equal(renderPassphrase(['acid', 'acorn', 'acre'], 'space'), 'acid acorn acre');
});

test('renderPassphrase: hyphen separator', () => {
  assert.equal(renderPassphrase(['acid', 'acorn', 'acre'], 'hyphen'), 'acid-acorn-acre');
});

test('renderPassphrase: dot separator', () => {
  assert.equal(renderPassphrase(['acid', 'acorn', 'acre'], 'dot'), 'acid.acorn.acre');
});

test('renderPassphrase: none joins with empty string', () => {
  assert.equal(renderPassphrase(['acid', 'acorn', 'acre'], 'none'), 'acidacornacre');
});

test('renderPassphrase: word count matches when split by separator', () => {
  var phrase = renderPassphrase(['a', 'b', 'c', 'd', 'e', 'f'], 'hyphen');
  assert.equal(phrase.split('-').length, 6);
});

// --- resistance summary ---------------------------------------------------

test('resistanceSummary returns a sensible band for 6 words', () => {
  var s = resistanceSummary(entropyBits(6));
  assert.equal(typeof s, 'string');
  assert.equal(s.length > 10, true);
});

test('resistanceSummary differs across low and high entropy', () => {
  var low = resistanceSummary(entropyBits(3));
  var high = resistanceSummary(entropyBits(10));
  assert.notEqual(low, high);
});

// --- unbiased index sampling ---------------------------------------------

test('unbiasedRandomIndex returns an integer in [0, range)', () => {
  // Inject a deterministic source: a UInt32 generator that cycles.
  var counter = 0;
  function fakeRand32() {
    counter = (counter + 0x12345678) >>> 0;
    return counter;
  }
  for (var i = 0; i < 100; i++) {
    var idx = unbiasedRandomIndex(1296, fakeRand32);
    assert.equal(Number.isInteger(idx), true);
    assert.equal(idx >= 0 && idx < 1296, true);
  }
});

test('unbiasedRandomIndex rejects values in the biased tail', () => {
  // For a range of 1296, the largest acceptable UInt32 multiple is
  // floor(2^32 / 1296) * 1296 - 1. Any draw at-or-above the limit must be
  // rejected. We feed first a value in the biased tail, then a clean value.
  var range = 1296;
  var limit = Math.floor(0x100000000 / range) * range; // the cutoff
  var calls = 0;
  function src() {
    calls += 1;
    if (calls === 1) return limit;       // must be rejected
    if (calls === 2) return limit + 1;   // also rejected
    return 5;                            // accepted: 5 % 1296 === 5
  }
  assert.equal(unbiasedRandomIndex(range, src), 5);
  assert.equal(calls, 3);
});
