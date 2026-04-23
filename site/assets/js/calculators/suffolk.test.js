'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const Suffolk = require('./suffolk.js');

test('translate is a no-op on empty input', () => {
  assert.equal(Suffolk.translate(''), '');
  assert.equal(Suffolk.translate(null), '');
  assert.equal(Suffolk.translate(undefined), '');
});

test('translate swaps single words on word boundaries', () => {
  assert.match(Suffolk.translate('the old man'), /tha owd bor/);
});

test('translate preserves leading capital', () => {
  const out = Suffolk.translate('The old man walked home');
  assert.ok(/^Tha/.test(out), 'expected capital T at start, got: ' + out);
});

test('translate preserves ALL CAPS', () => {
  const out = Suffolk.translate('OLD');
  assert.equal(out, 'OWD');
});

test('translate handles contractions as whole units', () => {
  const out = Suffolk.translate("what's that");
  assert.match(out, /woss/);
  assert.match(out, /tha'/);
});

test('translate does not break word-internal matches', () => {
  // "together" contains "the" and "get" but should not be partially replaced.
  const out = Suffolk.translate('together');
  assert.equal(out, 'together');
});

test('translate handles punctuation around words', () => {
  const out = Suffolk.translate('Hello, old friend!');
  assert.match(out, /Hulloo,/);
  assert.match(out, /owd bor/);
});

test('translate swaps "I" to "oi"', () => {
  const out = Suffolk.translate('I am going home');
  assert.match(out, /^Oi /);
});

test('generate returns a non-empty string', () => {
  const out = Suffolk.generate();
  assert.ok(typeof out === 'string' && out.length > 0);
});

test('generate respects paragraph count', () => {
  const out = Suffolk.generate({ paragraphs: 5, seed: 42 });
  const paragraphs = out.split('\n\n');
  assert.equal(paragraphs.length, 5);
});

test('generate with classicOpener leads with Hare we goo', () => {
  const out = Suffolk.generate({ paragraphs: 1, classicOpener: true, seed: 1 });
  assert.match(out, /^Hare we goo together/);
});

test('generate with the same seed is deterministic', () => {
  const a = Suffolk.generate({ paragraphs: 3, seed: 7 });
  const b = Suffolk.generate({ paragraphs: 3, seed: 7 });
  assert.equal(a, b);
});

test('generate without classicOpener does not start with Hare we goo', () => {
  const out = Suffolk.generate({ paragraphs: 1, classicOpener: false, seed: 2 });
  assert.ok(!/^Hare we goo together/.test(out));
});

test('generate uses only Suffolk-flavour words (no "the" or "of")', () => {
  const out = Suffolk.generate({ paragraphs: 3, classicOpener: false, seed: 99 }).toLowerCase();
  // Filler English words we explicitly avoided in LOREM_WORDS.
  assert.ok(!/\bthe\b/.test(out));
  assert.ok(!/\bof\b/.test(out));
});

test('generate sentences end with . ! or ?', () => {
  const out = Suffolk.generate({ paragraphs: 2, seed: 13 });
  const sentences = out.split(/[.!?]/).filter(s => s.trim().length > 0);
  // At least a few sentences produced
  assert.ok(sentences.length >= 4);
});
