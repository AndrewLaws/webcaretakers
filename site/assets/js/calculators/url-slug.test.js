'use strict';

var test = require('node:test');
var assert = require('node:assert');
var { generateSlug, transliterate } = require('./url-slug');

test('basic: lowercase, hyphen-separated', function () {
  var r = generateSlug({ text: 'Hello World' });
  assert.strictEqual(r.slug, 'hello-world');
});

test('strips punctuation and collapses whitespace', function () {
  var r = generateSlug({ text: 'Hello,   world!!  What?' });
  assert.strictEqual(r.slug, 'hello-world-what');
});

test('transliterates accents to ASCII', function () {
  assert.strictEqual(transliterate('café'), 'café'.replace('é', 'e'));
  var r = generateSlug({ text: 'Café Münster' });
  assert.strictEqual(r.slug, 'cafe-munster');
});

test('transliterates smart quotes and dashes', function () {
  var r = generateSlug({ text: 'It’s a “test” – really' });
  assert.strictEqual(r.slug, 'it-s-a-test-really');
});

test('underscore separator', function () {
  var r = generateSlug({ text: 'Hello World', separator: '_' });
  assert.strictEqual(r.slug, 'hello_world');
});

test('removeStopWords strips common words', function () {
  var r = generateSlug({ text: 'The quick brown fox jumps over the lazy dog', removeStopWords: true });
  assert.strictEqual(r.slug, 'quick-brown-fox-jumps-lazy-dog');
  assert.deepStrictEqual(r.dropped.map(s => s.toLowerCase()), ['the','over','the']);
});

test('removeStopWords leaves something even if every word is a stop word', function () {
  var r = generateSlug({ text: 'and or the', removeStopWords: true });
  // Should fall back to keeping the words.
  assert.strictEqual(r.slug, 'and-or-the');
});

test('maxLength truncates on word boundary', function () {
  var r = generateSlug({ text: 'the quick brown fox jumps over the lazy dog', maxLength: 20 });
  assert.ok(r.slug.length <= 20, 'length within limit: ' + r.slug);
  assert.strictEqual(r.truncated, true);
  // Should not end on a separator.
  assert.ok(!r.slug.endsWith('-'));
});

test('empty text returns empty slug', function () {
  var r = generateSlug({ text: '' });
  assert.strictEqual(r.slug, '');
  assert.strictEqual(r.wordCount, 0);
});

test('numbers are preserved', function () {
  var r = generateSlug({ text: '2025 Best Practices' });
  assert.strictEqual(r.slug, '2025-best-practices');
});

test('lowercase false preserves case', function () {
  var r = generateSlug({ text: 'Hello World', lowercase: false });
  assert.strictEqual(r.slug, 'Hello-World');
});

test('trims leading/trailing separators', function () {
  var r = generateSlug({ text: '---hello world---' });
  assert.strictEqual(r.slug, 'hello-world');
});
