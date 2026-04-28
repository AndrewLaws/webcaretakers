'use strict';

/**
 * Magic 8-Ball: pure-logic library.
 *
 * The classic Mattel Magic 8-Ball oracle: 20 canonical answers, 10 affirmative,
 * 5 non-committal, 5 negative. The user types a yes/no question, the ball
 * "shakes", one of the 20 answers is returned.
 *
 * Randomness uses crypto.getRandomValues with rejection sampling against the
 * largest multiple of n below 2^32. No Math.random anywhere in the draw path.
 *
 * Pluggable randomInt: tests can substitute a deterministic source.
 */

// The canonical 20 Mattel Magic 8-Ball answers, in their canonical order.
// Source: the underside of every Magic 8-Ball ever sold.
var ANSWERS = Object.freeze([
  { text: 'It is certain.',                 category: 'Affirmative' },
  { text: 'It is decidedly so.',            category: 'Affirmative' },
  { text: 'Without a doubt.',               category: 'Affirmative' },
  { text: 'Yes definitely.',                category: 'Affirmative' },
  { text: 'You may rely on it.',            category: 'Affirmative' },
  { text: 'As I see it, yes.',              category: 'Affirmative' },
  { text: 'Most likely.',                   category: 'Affirmative' },
  { text: 'Outlook good.',                  category: 'Affirmative' },
  { text: 'Yes.',                           category: 'Affirmative' },
  { text: 'Signs point to yes.',            category: 'Affirmative' },
  { text: 'Reply hazy, try again.',         category: 'Non-committal' },
  { text: 'Ask again later.',               category: 'Non-committal' },
  { text: 'Better not tell you now.',       category: 'Non-committal' },
  { text: 'Cannot predict now.',            category: 'Non-committal' },
  { text: 'Concentrate and ask again.',     category: 'Non-committal' },
  { text: "Don't count on it.",             category: 'Negative' },
  { text: 'My reply is no.',                category: 'Negative' },
  { text: 'My sources say no.',             category: 'Negative' },
  { text: 'Outlook not so good.',           category: 'Negative' },
  { text: 'Very doubtful.',                 category: 'Negative' }
]);

/**
 * Build a randomInt function from a crypto-like object exposing
 * getRandomValues(Uint32Array). Used by tests to inject a deterministic
 * source, and by the default RNG with the real Web Crypto.
 *
 * Rejection sampling against `limit = max - ((max + 1) mod n)`, the largest
 * value that gives an unbiased mod-n result. For n that divides 2^32 evenly
 * (n = 1, 2, 4, ..., 16, ..., 20 does not divide), the limit equals max and
 * no rejection occurs.
 */
function rngFromCryptoLike(c) {
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('rngFromCryptoLike: need a crypto-like object with getRandomValues.');
  }
  return function (n) {
    if (!Number.isInteger(n) || n <= 0) throw new Error('randomInt: n must be a positive integer.');
    var max = 0xFFFFFFFF;
    // (max + 1) mod n, computed without overflow in JS doubles.
    var rem = ((max + 1) % n);
    var limit = max - rem; // largest acceptable value; if rem === 0 then limit === max.
    var buf = new Uint32Array(1);
    while (true) {
      c.getRandomValues(buf);
      if (buf[0] <= limit) return buf[0] % n;
    }
  };
}

function defaultRandomInt(n) {
  var c = (typeof crypto !== 'undefined') ? crypto
        : (typeof globalThis !== 'undefined' && globalThis.crypto) ? globalThis.crypto
        : null;
  if (!c) throw new Error('Web Crypto not available in this environment.');
  return rngFromCryptoLike(c)(n);
}

/**
 * Pick one of the 20 canonical answers using an unbiased crypto draw.
 * Pass a deterministic randomInt for tests.
 */
function getAnswer(randomInt) {
  var rnd = randomInt || defaultRandomInt;
  var i = rnd(ANSWERS.length);
  return ANSWERS[i];
}

/**
 * Count of answers per category, derived from the ANSWERS list. Useful for
 * the Prove It panel and as a self-check.
 */
function categoryCounts() {
  var c = { Affirmative: 0, 'Non-committal': 0, Negative: 0 };
  for (var i = 0; i < ANSWERS.length; i++) c[ANSWERS[i].category]++;
  return c;
}

var api = {
  ANSWERS: ANSWERS,
  getAnswer: getAnswer,
  categoryCounts: categoryCounts,
  rngFromCryptoLike: rngFromCryptoLike,
  defaultRandomInt: defaultRandomInt
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.Magic8Ball = api;
}
