'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./flesch-reading-ease-calculator.js');

// Word count
test('countWords: empty string is 0', () => {
  assert.equal(lib.countWords(''), 0);
});
test('countWords: whitespace only is 0', () => {
  assert.equal(lib.countWords('   \n\t '), 0);
});
test('countWords: single word', () => {
  assert.equal(lib.countWords('hello'), 1);
});
test('countWords: simple sentence', () => {
  assert.equal(lib.countWords('The cat sat on the mat.'), 6);
});
test('countWords: ignores empty tokens from extra whitespace', () => {
  assert.equal(lib.countWords('  one   two\nthree\t four '), 4);
});

// Sentence count
test('countSentences: empty string is 0', () => {
  assert.equal(lib.countSentences(''), 0);
});
test('countSentences: single sentence ending in full stop', () => {
  assert.equal(lib.countSentences('The cat sat on the mat.'), 1);
});
test('countSentences: a sentence without terminal punctuation still counts', () => {
  assert.equal(lib.countSentences('Hello there'), 1);
});
test('countSentences: multiple sentences mixed punctuation', () => {
  assert.equal(lib.countSentences('Hello there. How are you? I am fine!'), 3);
});

// Syllable count: known cases
test('countSyllables: hello -> 2', () => {
  assert.equal(lib.countSyllables('hello'), 2);
});
test('countSyllables: fire -> 1', () => {
  assert.equal(lib.countSyllables('fire'), 1);
});
test('countSyllables: table -> 2', () => {
  assert.equal(lib.countSyllables('table'), 2);
});
test('countSyllables: the -> 1', () => {
  assert.equal(lib.countSyllables('the'), 1);
});
test('countSyllables: minimum 1 for any word', () => {
  assert.equal(lib.countSyllables('rhythm'), 1);
});

// Total syllables across text
test('countTotalSyllables: simple text', () => {
  // The(1) cat(1) sat(1) on(1) the(1) mat(1) = 6
  assert.equal(lib.countTotalSyllables('The cat sat on the mat.'), 6);
});

// Formulae
test('analyse: empty text returns zeroed scores and counts', () => {
  const r = lib.analyse('');
  assert.equal(r.words, 0);
  assert.equal(r.sentences, 0);
  assert.equal(r.syllables, 0);
  assert.equal(r.readingEase, 0);
  assert.equal(r.gradeLevel, 0);
});

test('analyse: single word returns scores without crashing', () => {
  const r = lib.analyse('hello');
  assert.equal(r.words, 1);
  assert.equal(r.sentences, 1);
  assert.equal(r.syllables, 2);
  // 206.835 - 1.015*(1/1) - 84.6*(2/1) = 206.835 - 1.015 - 169.2 = 36.62
  assert.ok(Math.abs(r.readingEase - 36.62) < 0.01);
});

test('analyse: "The cat sat on the mat." is very easy to read', () => {
  const r = lib.analyse('The cat sat on the mat.');
  assert.equal(r.words, 6);
  assert.equal(r.sentences, 1);
  assert.equal(r.syllables, 6);
  // 206.835 - 1.015*(6/1) - 84.6*(6/6) = 206.835 - 6.09 - 84.6 = 116.145
  assert.ok(Math.abs(r.readingEase - 116.145) < 0.01);
  // Grade Level = 0.39*(6/1) + 11.8*(6/6) - 15.59 = 2.34 + 11.8 - 15.59 = -1.45
  assert.ok(Math.abs(r.gradeLevel - (-1.45)) < 0.01);
});

test('band: 95 -> Very easy band', () => {
  const b = lib.band(95);
  assert.match(b.label, /Very easy/i);
});
test('band: 65 -> Plain English band', () => {
  const b = lib.band(65);
  assert.match(b.label, /Plain English/i);
});
test('band: 40 -> Difficult', () => {
  const b = lib.band(40);
  assert.match(b.label, /Difficult/i);
});
test('band: 10 -> Very confusing', () => {
  const b = lib.band(10);
  assert.match(b.label, /confusing|graduate/i);
});
