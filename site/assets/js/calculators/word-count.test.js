'use strict';

var test = require('node:test');
var assert = require('node:assert');
var { analyseText, countWords, countCharacters, countSentences, countParagraphs, averageWordLength } = require('./word-count');

test('countWords basic', function () {
  assert.strictEqual(countWords('hello world'), 2);
  assert.strictEqual(countWords('  hello   world  '), 2);
  assert.strictEqual(countWords(''), 0);
  assert.strictEqual(countWords('one'), 1);
});

test('countCharacters with and without spaces', function () {
  assert.strictEqual(countCharacters('hello world', true), 11);
  assert.strictEqual(countCharacters('hello world', false), 10);
});

test('countSentences: terminators', function () {
  assert.strictEqual(countSentences('One. Two! Three?'), 3);
  assert.strictEqual(countSentences('No terminator here'), 1);
  assert.strictEqual(countSentences(''), 0);
});

test('countParagraphs: blank-line separated', function () {
  assert.strictEqual(countParagraphs('one\n\ntwo\n\nthree'), 3);
  assert.strictEqual(countParagraphs('single paragraph'), 1);
  assert.strictEqual(countParagraphs(''), 0);
  assert.strictEqual(countParagraphs('\n\n'), 0);
});

test('averageWordLength', function () {
  // "cat dog" → (3+3)/2 = 3
  assert.strictEqual(averageWordLength('cat dog'), 3);
  // empty → 0
  assert.strictEqual(averageWordLength(''), 0);
});

test('analyseText: full breakdown', function () {
  var r = analyseText({ text: 'The quick brown fox jumps over the lazy dog.' });
  assert.strictEqual(r.words, 9);
  assert.strictEqual(r.characters, 44);
  assert.strictEqual(r.sentences, 1);
  assert.strictEqual(r.paragraphs, 1);
});

test('limits: tweet under cap', function () {
  var r = analyseText({ text: 'hello' });
  assert.strictEqual(r.limits.tweet.cap, 280);
  assert.strictEqual(r.limits.tweet.remaining, 275);
  assert.strictEqual(r.limits.tweet.status, 'under');
  assert.strictEqual(r.limits.tweet.overBy, 0);
});

test('limits: meta over cap', function () {
  var r = analyseText({ text: 'x'.repeat(200) });
  assert.strictEqual(r.limits.meta.status, 'over');
  assert.strictEqual(r.limits.meta.remaining, -40);
  assert.strictEqual(r.limits.meta.overBy, 40);
});

test('limits: near cap warning', function () {
  // title cap 60, 50 chars → remaining 10 → near
  var r = analyseText({ text: 'x'.repeat(50) });
  assert.strictEqual(r.limits.title.status, 'near');
});

test('limits: empty status', function () {
  var r = analyseText({ text: '' });
  assert.strictEqual(r.limits.tweet.status, 'empty');
});

test('analyseText: multi-paragraph prose', function () {
  var text = 'One two three.\n\nFour five six seven.\n\nEight.';
  var r = analyseText({ text: text });
  assert.strictEqual(r.words, 8);
  assert.strictEqual(r.paragraphs, 3);
  assert.strictEqual(r.sentences, 3);
});

test('analyseText: non-string text is treated as empty', function () {
  var r = analyseText({ text: null });
  assert.strictEqual(r.words, 0);
  assert.strictEqual(r.characters, 0);
});
