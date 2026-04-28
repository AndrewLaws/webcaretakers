'use strict';

/**
 * Dice and Coin Roller: pure-logic library.
 *
 * Runs entirely in the browser. No fetch, no XHR, no third-party endpoint.
 *
 * Randomness comes from crypto.getRandomValues. The naive (rand % n) reduction
 * introduces bias when 2^32 is not a multiple of n: lower remainders are
 * slightly more likely. We avoid that with rejection sampling: any draw above
 * the largest multiple of n that fits in 2^32 is discarded and re-drawn.
 *
 * Dice notation supported:
 *   d6, 3d8, 1d20+5, 2d6-3, 4d6kh3, 4d6kl1
 * Cap: count 1..100, sides 2..1000.
 */

var COUNT_MIN = 1;
var COUNT_MAX = 100;
var SIDES_MIN = 2;
var SIDES_MAX = 1000;
var COIN_MAX = 1000;

function defaultRandomInt(n) {
  if (n <= 0) throw new Error('randomInt: n must be positive');
  var c = (typeof crypto !== 'undefined') ? crypto
        : (typeof globalThis !== 'undefined' && globalThis.crypto) ? globalThis.crypto
        : null;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('Web Crypto not available in this environment.');
  }
  var max = 0xFFFFFFFF;
  var limit = max - ((max + 1) % n);
  var buf = new Uint32Array(1);
  while (true) {
    c.getRandomValues(buf);
    if (buf[0] <= limit) return buf[0] % n;
  }
}

/**
 * Parse a tabletop dice notation string.
 *
 * Returns:
 *   { ok: true, count, sides, modifier, keep }
 *   { ok: false, message }
 *
 * `keep` is null or { type: 'h'|'l', n: number }.
 */
function parseDiceNotation(input) {
  if (typeof input !== 'string') {
    return { ok: false, message: 'Enter a notation like 2d6 or 1d20+5.' };
  }
  var s = input.trim().toLowerCase();
  if (!s) return { ok: false, message: 'Enter a notation like 2d6 or 1d20+5.' };

  // count? d sides ( + or - mod )? ( k (h|l) keep )?
  var re = /^(\d*)d(\d+)(?:([+-])(\d+))?(?:k([hl])(\d+))?$/;
  var m = s.match(re);
  if (!m) {
    return { ok: false, message: 'Could not parse "' + input + '". Try 2d6, 1d20+5, or 4d6kh3.' };
  }

  var count = m[1] === '' ? 1 : parseInt(m[1], 10);
  var sides = parseInt(m[2], 10);
  var sign = m[3];
  var modVal = m[4] != null ? parseInt(m[4], 10) : 0;
  var modifier = sign === '-' ? -modVal : modVal;
  var keepType = m[5] || null;
  var keepN = m[6] != null ? parseInt(m[6], 10) : null;

  if (count < COUNT_MIN || count > COUNT_MAX) {
    return { ok: false, message: 'Dice count must be between ' + COUNT_MIN + ' and ' + COUNT_MAX + '.' };
  }
  if (sides < SIDES_MIN || sides > SIDES_MAX) {
    return { ok: false, message: 'Sides must be between ' + SIDES_MIN + ' and ' + SIDES_MAX + '.' };
  }

  var keep = null;
  if (keepType) {
    if (keepN < 1) {
      return { ok: false, message: 'Keep count must be at least 1.' };
    }
    if (keepN > count) {
      return { ok: false, message: 'Cannot keep ' + keepN + ' out of ' + count + ' dice.' };
    }
    keep = { type: keepType, n: keepN };
  }

  return { ok: true, count: count, sides: sides, modifier: modifier, keep: keep };
}

/**
 * Roll a parsed notation. randomInt is injectable for tests.
 *
 * Returns { rolls, kept, modifier, total }.
 *   rolls: every die's face value, in roll order
 *   kept:  the subset that contributed to the sum (same as rolls if no keep)
 *   total: sum(kept) + modifier
 */
function rollDice(parsed, randomInt) {
  var rnd = randomInt || defaultRandomInt;
  var rolls = [];
  for (var i = 0; i < parsed.count; i++) {
    rolls.push(rnd(parsed.sides) + 1);
  }
  var kept;
  if (parsed.keep) {
    var sorted = rolls.slice().sort(function (a, b) { return a - b; });
    if (parsed.keep.type === 'h') {
      kept = sorted.slice(sorted.length - parsed.keep.n);
    } else {
      kept = sorted.slice(0, parsed.keep.n);
    }
  } else {
    kept = rolls.slice();
  }
  var sum = 0;
  for (var k = 0; k < kept.length; k++) sum += kept[k];
  return {
    rolls: rolls,
    kept: kept,
    modifier: parsed.modifier || 0,
    total: sum + (parsed.modifier || 0)
  };
}

/**
 * Flip n coins. Returns { flips: ['H','T',...], heads, tails }.
 */
function flipCoins(n, randomInt) {
  if (typeof n !== 'number' || !isFinite(n) || n < 1 || Math.floor(n) !== n) {
    throw new Error('Coin count must be a whole number of at least 1.');
  }
  if (n > COIN_MAX) {
    throw new Error('Coin count cannot exceed ' + COIN_MAX + '.');
  }
  var rnd = randomInt || defaultRandomInt;
  var flips = [];
  var heads = 0;
  var tails = 0;
  for (var i = 0; i < n; i++) {
    if (rnd(2) === 0) {
      flips.push('H');
      heads++;
    } else {
      flips.push('T');
      tails++;
    }
  }
  return { flips: flips, heads: heads, tails: tails };
}

/**
 * Format a roll record for the history list.
 */
function formatRoll(record) {
  if (record.mode === 'dice') {
    var note = record.notation;
    var rollsStr = record.rolls.join(', ');
    var keepNote = '';
    if (record.kept && record.rolls && record.kept.length !== record.rolls.length) {
      keepNote = ' (kept ' + record.kept.join(', ') + ')';
    }
    var modStr = '';
    if (record.modifier > 0) modStr = ' +' + record.modifier;
    else if (record.modifier < 0) modStr = ' ' + record.modifier;
    return note + ': [' + rollsStr + ']' + keepNote + modStr + ' = ' + record.total;
  }
  if (record.mode === 'coin') {
    return record.count + ' coin' + (record.count === 1 ? '' : 's') +
      ': ' + record.heads + ' heads, ' + record.tails + ' tails';
  }
  return '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseDiceNotation: parseDiceNotation,
    rollDice: rollDice,
    flipCoins: flipCoins,
    formatRoll: formatRoll,
    defaultRandomInt: defaultRandomInt,
    LIMITS: {
      COUNT_MIN: COUNT_MIN, COUNT_MAX: COUNT_MAX,
      SIDES_MIN: SIDES_MIN, SIDES_MAX: SIDES_MAX,
      COIN_MAX: COIN_MAX
    }
  };
}
if (typeof window !== 'undefined') {
  window.DiceAndCoinRoller = {
    parseDiceNotation: parseDiceNotation,
    rollDice: rollDice,
    flipCoins: flipCoins,
    formatRoll: formatRoll,
    randomInt: defaultRandomInt,
    LIMITS: {
      COUNT_MIN: COUNT_MIN, COUNT_MAX: COUNT_MAX,
      SIDES_MIN: SIDES_MIN, SIDES_MAX: SIDES_MAX,
      COIN_MAX: COIN_MAX
    }
  };
}
