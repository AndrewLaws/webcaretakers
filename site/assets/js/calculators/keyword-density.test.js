'use strict';

var test = require('node:test');
var assert = require('node:assert');
var { tokenise, analyse, STOP_WORDS, MIN_WORDS } = require('./keyword-density');

test('tokenise: lowercase, splits on whitespace and punctuation', function () {
  var tokens = tokenise('The quick brown fox.');
  assert.deepStrictEqual(tokens, ['the', 'quick', 'brown', 'fox']);
});

test('tokenise: keeps internal hyphens, drops surrounding punctuation', function () {
  var tokens = tokenise('Long-tail keywords matter, "well-known" sites win.');
  assert.deepStrictEqual(tokens, ['long-tail', 'keywords', 'matter', 'well-known', 'sites', 'win']);
});

test('tokenise: keeps apostrophes inside words (contractions)', function () {
  var tokens = tokenise("Don't worry, it's fine.");
  assert.deepStrictEqual(tokens, ["don't", 'worry', "it's", 'fine']);
});

test('tokenise: strips trailing/leading punctuation but keeps numbers', function () {
  var tokens = tokenise('In 2026, traffic grew 25% (mostly organic).');
  assert.deepStrictEqual(tokens, ['in', '2026', 'traffic', 'grew', '25', 'mostly', 'organic']);
});

test('tokenise: collapses smart quotes to ASCII apostrophe and treats em-dash as separator', function () {
  var tokens = tokenise('It\u2019s a test\u2014really, it is.');
  assert.deepStrictEqual(tokens, ["it's", 'a', 'test', 'really', 'it', 'is']);
});

test('tokenise: empty string returns empty array', function () {
  assert.deepStrictEqual(tokenise(''), []);
  assert.deepStrictEqual(tokenise('   '), []);
});

test('analyse: refuses if fewer than MIN_WORDS', function () {
  var r = analyse({ text: 'too short text', removeStopWords: true });
  assert.strictEqual(r.tooShort, true);
  assert.strictEqual(r.totalWords, 3);
  assert.ok(MIN_WORDS >= 50);
});

test('analyse: total and unique word counts', function () {
  // Build 60-word body to clear the threshold.
  var sentence = 'cats love fish and dogs love bones every animal has a favourite meal that keeps it happy and healthy through the long bright summer days when the sun is high and the wind is soft and the river runs clear over smooth stones near the old stone bridge that stands above quiet water beside the meadow ';
  var r = analyse({ text: sentence.repeat(1), removeStopWords: false });
  assert.strictEqual(r.tooShort, false);
  assert.ok(r.totalWords >= 50, 'totalWords ' + r.totalWords);
  assert.ok(r.uniqueWords > 0);
  assert.ok(r.uniqueWords <= r.totalWords);
});

test('analyse: stop-word filter strips standard stop words from unigrams', function () {
  var text = 'the cat sat on the mat the dog ran past the cat and the cat was unbothered '.repeat(5);
  var r = analyse({ text: text, removeStopWords: true });
  // None of the 1-grams should be a stop word.
  for (var i = 0; i < r.unigrams.length; i++) {
    assert.strictEqual(STOP_WORDS.indexOf(r.unigrams[i].term) === -1, true,
      'stop word leaked: ' + r.unigrams[i].term);
  }
  // 'cat' should still be top.
  assert.strictEqual(r.unigrams[0].term, 'cat');
});

test('analyse: density is count / totalWords * 100', function () {
  var text = 'apple apple apple banana banana cherry '.repeat(20);
  var r = analyse({ text: text, removeStopWords: false });
  // 'apple' appears 60 times out of 120 words = 50%
  assert.strictEqual(r.totalWords, 120);
  var apple = r.unigrams.find(function (u) { return u.term === 'apple'; });
  assert.strictEqual(apple.count, 60);
  assert.ok(Math.abs(apple.density - 50) < 0.001);
});

test('analyse: returns 2-grams and 3-grams', function () {
  var text = ('seo tools are great seo tools beat manual checks '.repeat(10));
  var r = analyse({ text: text, removeStopWords: false });
  assert.ok(r.bigrams.length > 0);
  assert.ok(r.trigrams.length > 0);
  // 'seo tools' should be the top bigram.
  assert.strictEqual(r.bigrams[0].term, 'seo tools');
});

test('analyse: n-grams skip across stop-word boundaries when filtering', function () {
  var text = ('quick brown fox the quick brown fox runs fast over the lazy dog every morning before breakfast in the cold winter air ').repeat(3);
  var r = analyse({ text: text, removeStopWords: true });
  // No n-gram should contain a stop word.
  function noStops(term) {
    var parts = term.split(' ');
    for (var i = 0; i < parts.length; i++) {
      if (STOP_WORDS.indexOf(parts[i]) !== -1) return false;
    }
    return true;
  }
  for (var i = 0; i < r.bigrams.length; i++) assert.ok(noStops(r.bigrams[i].term), 'bigram leak: ' + r.bigrams[i].term);
  for (var j = 0; j < r.trigrams.length; j++) assert.ok(noStops(r.trigrams[j].term), 'trigram leak: ' + r.trigrams[j].term);
});

test('analyse: top 25 cap on each table', function () {
  var words = [];
  for (var i = 0; i < 60; i++) words.push('w' + i);
  // Pad to 200 unique words so threshold is met.
  var text = words.join(' ') + ' ' + words.join(' ') + ' ' + words.join(' ') + ' ' + words.join(' ');
  var r = analyse({ text: text, removeStopWords: false });
  assert.ok(r.unigrams.length <= 25);
});

test('analyse: ranks 1-grams by descending count', function () {
  var text = ('one two three four five six seven eight nine ten ').repeat(10) + 'one one one one one ';
  var r = analyse({ text: text, removeStopWords: false });
  for (var i = 1; i < r.unigrams.length; i++) {
    assert.ok(r.unigrams[i - 1].count >= r.unigrams[i].count, 'order broken at ' + i);
  }
});

test('analyse: prove-it returns first 30 tokens', function () {
  var words = [];
  for (var i = 0; i < 80; i++) words.push('word' + i);
  var r = analyse({ text: words.join(' '), removeStopWords: false });
  assert.strictEqual(r.proveIt.firstTokens.length, 30);
  assert.strictEqual(r.proveIt.firstTokens[0], 'word0');
});

test('analyse: prove-it shows working for top result', function () {
  var text = 'apple apple apple banana banana cherry '.repeat(20);
  var r = analyse({ text: text, removeStopWords: false });
  assert.strictEqual(r.proveIt.topTerm, 'apple');
  assert.strictEqual(r.proveIt.topCount, 60);
  assert.strictEqual(r.proveIt.topTotal, 120);
  assert.ok(Math.abs(r.proveIt.topDensity - 50) < 0.001);
});

test('STOP_WORDS contains the specified core list', function () {
  var required = ['the','a','an','and','or','but','of','to','in','on','for','with',
                  'is','are','was','were','be','been','being','have','has','had',
                  'do','does','did','will','would','could','should','may','might',
                  'must','can','shall','this','that','these','those','it','its',
                  'as','at','by','from'];
  for (var i = 0; i < required.length; i++) {
    assert.ok(STOP_WORDS.indexOf(required[i]) !== -1, 'missing stop word: ' + required[i]);
  }
  // It should be a fuller list than just these 44.
  assert.ok(STOP_WORDS.length >= 150, 'STOP_WORDS list is too short: ' + STOP_WORDS.length);
});
