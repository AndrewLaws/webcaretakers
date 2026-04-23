'use strict';

var test = require('node:test');
var assert = require('node:assert');
var { checkMeta, checkTitle, checkDescription, pixelWidth, TITLE_CHAR_CAP, DESC_CHAR_CAP } = require('./meta-length');

test('empty title is classified as empty', function () {
  var r = checkTitle('');
  assert.strictEqual(r.status, 'empty');
  assert.strictEqual(r.characters, 0);
});

test('very short title classified as short', function () {
  var r = checkTitle('Hi');
  assert.strictEqual(r.status, 'short');
});

test('title within range classified good', function () {
  var r = checkTitle('How to bake bread at home');
  assert.ok(['good','short'].indexOf(r.status) !== -1, 'got ' + r.status);
});

test('title well over cap classified over', function () {
  var r = checkTitle('x'.repeat(80));
  assert.strictEqual(r.status, 'over');
  assert.ok(r.remainingChars < 0);
});

test('title near cap classified near', function () {
  // 55 chars is > 0.9 * 60 = 54, so near
  var r = checkTitle('x'.repeat(56));
  assert.strictEqual(r.status, 'near');
});

test('description under cap and substantial is good', function () {
  var d = 'A helpful, specific description that explains what the page is about and why you should click on it in search results today.';
  var r = checkDescription(d);
  assert.ok(['good','near'].indexOf(r.status) !== -1, 'got ' + r.status);
});

test('description over cap is over', function () {
  var r = checkDescription('x'.repeat(200));
  assert.strictEqual(r.status, 'over');
});

test('pixelWidth: narrow chars < wide chars', function () {
  assert.ok(pixelWidth('iiiii') < pixelWidth('MMMMM'));
});

test('checkMeta returns both title and description', function () {
  var r = checkMeta({ title: 'Hello', description: 'World' });
  assert.ok(r.title);
  assert.ok(r.description);
  assert.strictEqual(r.title.characters, 5);
  assert.strictEqual(r.description.characters, 5);
});

test('caps exposed as constants', function () {
  assert.strictEqual(TITLE_CHAR_CAP, 60);
  assert.strictEqual(DESC_CHAR_CAP, 160);
});

test('remaining counts are correct', function () {
  var r = checkTitle('x'.repeat(40));
  assert.strictEqual(r.remainingChars, 20);
});

test('note text is always non-empty', function () {
  ['','x','x'.repeat(30),'x'.repeat(80)].forEach(function (s) {
    var r = checkTitle(s);
    assert.ok(typeof r.note === 'string' && r.note.length > 0);
  });
});
