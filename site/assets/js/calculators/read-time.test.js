'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateReadTime, countWords, countCharacters, countSentences, formatDuration } = require('./read-time.js');

test('countWords handles various whitespace', () => {
  assert.equal(countWords('hello world'), 2);
  assert.equal(countWords('  hello   world  '), 2);
  assert.equal(countWords('one\ntwo\nthree'), 3);
  assert.equal(countWords(''), 0);
  assert.equal(countWords('   '), 0);
});

test('countWords handles punctuation cleanly', () => {
  assert.equal(countWords("it's a sunny day, isn't it?"), 6);
});

test('countCharacters with/without spaces', () => {
  assert.equal(countCharacters('hello world', true), 11);
  assert.equal(countCharacters('hello world', false), 10);
});

test('countSentences counts full stops, questions, exclamations', () => {
  assert.equal(countSentences('One. Two! Three?'), 3);
  assert.equal(countSentences('Just one.'), 1);
  assert.equal(countSentences('No terminator'), 1);
  assert.equal(countSentences(''), 0);
});

test('formatDuration: < 1 minute shows seconds only', () => {
  const d = formatDuration(0.5);
  assert.equal(d.label, '30 sec');
});

test('formatDuration: exact minutes', () => {
  const d = formatDuration(2);
  assert.equal(d.label, '2 min');
});

test('formatDuration: minutes + seconds', () => {
  const d = formatDuration(1.5);
  assert.equal(d.label, '1 min 30 sec');
});

test('calculateReadTime: 500 words at default 250 WPM → 2 min silent', () => {
  const text = Array(500).fill('word').join(' ');
  const r = calculateReadTime({ text });
  assert.equal(r.words, 500);
  assert.equal(r.silent.label, '2 min');
  // 500 / 150 = 3.33 min = 3 min 20 sec
  assert.equal(r.aloud.label, '3 min 20 sec');
});

test('calculateReadTime: empty text', () => {
  const r = calculateReadTime({ text: '' });
  assert.equal(r.words, 0);
  assert.equal(r.silent.label, '0 sec');
});

test('calculateReadTime: custom WPM', () => {
  const text = Array(300).fill('word').join(' ');
  const r = calculateReadTime({ text, silentWpm: 300 });
  assert.equal(r.silent.label, '1 min');
});

test('throws on non-positive WPM', () => {
  assert.throws(() => calculateReadTime({ text: 'hi', silentWpm: 0 }));
  assert.throws(() => calculateReadTime({ text: 'hi', aloudWpm: -1 }));
});

test('populates all fields on success', () => {
  const r = calculateReadTime({ text: 'Hello world. This is a test.' });
  assert.equal(r.words, 6);
  assert.equal(r.sentences, 2);
  assert.ok(r.characters > 0);
  assert.ok(r.charactersNoSpaces < r.characters);
});
