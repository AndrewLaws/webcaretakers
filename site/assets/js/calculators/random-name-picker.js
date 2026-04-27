'use strict';

/**
 * Random Name Picker: pure-logic library.
 *
 * Runs entirely in the browser. No fetch, no XHR, no third-party endpoint.
 *
 * Randomness comes from crypto.getRandomValues. Bias from a naive
 * (rand % n) is removed by rejection sampling on Uint32 values: any draw
 * that lands in the unfair tail above the largest multiple of n that fits
 * in 2^32 is discarded and re-drawn.
 *
 * Two sampling modes:
 *   - withoutReplacement: partial Fisher-Yates shuffle. Each draw is unique.
 *   - withReplacement: independent uniform draws. Duplicates are allowed.
 */

// Pluggable RNG so tests can substitute a deterministic source.
function defaultRandomInt(n) {
  if (n <= 0) throw new Error('randomInt: n must be positive');
  // Using the local Web Crypto. Falls back to Node's webcrypto under tests.
  var c = (typeof crypto !== 'undefined') ? crypto
        : (typeof globalThis !== 'undefined' && globalThis.crypto) ? globalThis.crypto
        : null;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('Web Crypto not available in this environment.');
  }
  var max = 0xFFFFFFFF;
  var limit = max - ((max + 1) % n);
  var buf = new Uint32Array(1);
  // Loop until we draw a value in the fair range. The expected number of
  // iterations is at most 2, even in the worst case.
  while (true) {
    c.getRandomValues(buf);
    if (buf[0] <= limit) return buf[0] % n;
  }
}

/**
 * Parse a raw textarea string into a clean list:
 *   - split on newlines
 *   - trim whitespace on each entry
 *   - drop empty lines
 *   - drop exact duplicates (case-sensitive), preserving first-seen order
 *
 * Returns { names, rawCount, dedupedCount } where dedupedCount is how many
 * entries were removed for being duplicates (not blank lines).
 */
function parseNames(raw) {
  if (typeof raw !== 'string') return { names: [], rawCount: 0, dedupedCount: 0 };
  var lines = raw.split(/\r?\n/);
  var nonEmpty = [];
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.length > 0) nonEmpty.push(t);
  }
  var seen = Object.create(null);
  var unique = [];
  for (var j = 0; j < nonEmpty.length; j++) {
    var name = nonEmpty[j];
    if (!seen[name]) {
      seen[name] = true;
      unique.push(name);
    }
  }
  return {
    names: unique,
    rawCount: nonEmpty.length,
    dedupedCount: nonEmpty.length - unique.length
  };
}

/**
 * Validate a pick request. Returns { ok: true } or { ok: false, message }.
 */
function validatePick(names, count, allowDuplicates) {
  if (!Array.isArray(names) || names.length === 0) {
    return { ok: false, message: 'Add at least one name to pick from.' };
  }
  if (typeof count !== 'number' || !isFinite(count) || count < 1) {
    return { ok: false, message: 'Pick count must be at least 1.' };
  }
  if (Math.floor(count) !== count) {
    return { ok: false, message: 'Pick count must be a whole number.' };
  }
  if (!allowDuplicates && count > names.length) {
    return {
      ok: false,
      message: 'You asked for ' + count + ' picks but only have ' +
        names.length + ' names. Either add more names, reduce the pick count, ' +
        'or allow duplicates.'
    };
  }
  return { ok: true };
}

/**
 * Pick `count` names from `names`.
 *   allowDuplicates = true  -> sampling with replacement (independent draws).
 *   allowDuplicates = false -> sampling without replacement (partial shuffle).
 *
 * randomInt is the unbiased integer draw, injectable for tests.
 */
function pickNames(names, count, allowDuplicates, randomInt) {
  var rnd = randomInt || defaultRandomInt;
  var v = validatePick(names, count, allowDuplicates);
  if (!v.ok) throw new Error(v.message);

  if (allowDuplicates) {
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push(names[rnd(names.length)]);
    }
    return out;
  }

  // Partial Fisher-Yates: shuffle the first `count` positions of a working
  // copy, then return that prefix. This is unbiased provided rnd is unbiased.
  var pool = names.slice();
  var picked = [];
  var n = pool.length;
  for (var k = 0; k < count; k++) {
    var idx = k + rnd(n - k);
    var tmp = pool[k];
    pool[k] = pool[idx];
    pool[idx] = tmp;
    picked.push(pool[k]);
  }
  return picked;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseNames: parseNames,
    validatePick: validatePick,
    pickNames: pickNames,
    defaultRandomInt: defaultRandomInt
  };
}
if (typeof window !== 'undefined') {
  window.RandomNamePicker = {
    parseNames: parseNames,
    validatePick: validatePick,
    pickNames: pickNames,
    randomInt: defaultRandomInt
  };
}
