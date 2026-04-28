'use strict';

/**
 * Number Base Converter: pure logic library.
 *
 * Converts non-negative integers between binary (2), octal (8), decimal (10)
 * and hexadecimal (16), plus an arbitrary base from 2 to 36. BigInt is used
 * internally so values well beyond Number.MAX_SAFE_INTEGER round-trip
 * without precision loss.
 *
 * The four standard bases each have a short field name used by the page layer:
 *   bin  base 2
 *   oct  base 8
 *   dec  base 10
 *   hex  base 16
 */

var DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

var FIELD_TO_BASE = { bin: 2, oct: 8, dec: 10, hex: 16 };
var BASE_TO_FIELD = { 2: 'bin', 8: 'oct', 10: 'dec', 16: 'hex' };

function isValidBase(base) {
  return typeof base === 'number' && base >= 2 && base <= 36 && base === Math.floor(base);
}

/**
 * Returns true if every character in str is a valid digit for the given base.
 * Whitespace is not stripped, the caller should trim first if they want that.
 * Empty strings are not valid (no digits = no number).
 */
function isValidForBase(str, base) {
  if (typeof str !== 'string' || !isValidBase(base)) return false;
  if (str.length === 0) return false;
  var allowed = DIGITS.slice(0, base);
  var s = str.toLowerCase();
  for (var i = 0; i < s.length; i++) {
    if (allowed.indexOf(s[i]) === -1) return false;
  }
  return true;
}

/**
 * Parse a string written in the given base into a BigInt. Caller is expected to
 * have validated with isValidForBase first. Empty / invalid input throws.
 */
function toDecimal(str, base) {
  if (!isValidForBase(str, base)) throw new Error('Invalid digits for base ' + base);
  var s = str.toLowerCase();
  var b = BigInt(base);
  var n = 0n;
  for (var i = 0; i < s.length; i++) {
    var d = DIGITS.indexOf(s[i]);
    n = n * b + BigInt(d);
  }
  return n;
}

/**
 * Render a non-negative BigInt in the given base. Lowercase for hex / 36.
 */
function fromDecimal(n, base) {
  if (typeof n !== 'bigint') throw new Error('fromDecimal expects BigInt');
  if (!isValidBase(base)) throw new Error('Base must be between 2 and 36');
  if (n < 0n) throw new Error('Negative values are not supported');
  if (n === 0n) return '0';
  var b = BigInt(base);
  var out = '';
  while (n > 0n) {
    var r = Number(n % b);
    out = DIGITS[r] + out;
    n = n / b;
  }
  return out;
}

function exceedsMaxSafeInteger(bigintValue) {
  if (typeof bigintValue !== 'bigint') return false;
  return bigintValue > BigInt(Number.MAX_SAFE_INTEGER);
}

function baseLabel(base) {
  if (base === 2)  return 'binary';
  if (base === 8)  return 'octal';
  if (base === 10) return 'decimal';
  if (base === 16) return 'hexadecimal';
  return 'base ' + base;
}

function allowedDigitsHint(base) {
  if (base === 2)  return '0 and 1';
  if (base === 8)  return '0 to 7';
  if (base === 10) return '0 to 9';
  if (base === 16) return '0-9 and a-f';
  return '0-9 and a-' + DIGITS[base - 1];
}

/**
 * Convert from one of the four standard fields. Returns an object:
 *   { ok: true,  bin, oct, dec, hex, decimalBigInt, exceedsSafe }
 *   { ok: false, error: 'human-readable message' }
 *
 * An empty / whitespace-only input is treated as "clear all" and returns
 * ok=true with empty strings everywhere.
 */
function convertAll(field, rawValue) {
  var base = FIELD_TO_BASE[field];
  if (!base) return { ok: false, error: 'Unknown field: ' + field };

  var s = (rawValue == null ? '' : String(rawValue)).trim();
  if (s === '') {
    return { ok: true, bin: '', oct: '', dec: '', hex: '', decimalBigInt: null, exceedsSafe: false };
  }

  if (!isValidForBase(s, base)) {
    return {
      ok: false,
      error: baseLabel(base).charAt(0).toUpperCase() + baseLabel(base).slice(1) +
        ' values can only contain ' + allowedDigitsHint(base) + '.'
    };
  }

  var n = toDecimal(s, base);
  return {
    ok: true,
    bin: fromDecimal(n, 2),
    oct: fromDecimal(n, 8),
    dec: fromDecimal(n, 10),
    hex: fromDecimal(n, 16),
    decimalBigInt: n,
    exceedsSafe: exceedsMaxSafeInteger(n)
  };
}

/**
 * Convert from an arbitrary base (2 to 36) into all four standard bases.
 */
function convertAllFromArbitrary(rawValue, base) {
  if (!isValidBase(base)) return { ok: false, error: 'Base must be a whole number between 2 and 36.' };

  var s = (rawValue == null ? '' : String(rawValue)).trim();
  if (s === '') {
    return { ok: true, bin: '', oct: '', dec: '', hex: '', decimalBigInt: null, exceedsSafe: false };
  }

  if (!isValidForBase(s, base)) {
    return { ok: false, error: 'Base ' + base + ' values can only contain ' + allowedDigitsHint(base) + '.' };
  }

  var n = toDecimal(s, base);
  return {
    ok: true,
    bin: fromDecimal(n, 2),
    oct: fromDecimal(n, 8),
    dec: fromDecimal(n, 10),
    hex: fromDecimal(n, 16),
    decimalBigInt: n,
    exceedsSafe: exceedsMaxSafeInteger(n)
  };
}

/**
 * Build the long-division remainder trail for a given decimal BigInt and
 * target base. Returned as an array of { quotientIn, divisor, quotientOut,
 * remainder, digit } step objects, in the order the division is performed
 * (most-significant digit comes from the LAST step). Caps at 64 steps so
 * extreme values don't blow up the DOM. The page renders these as a table.
 */
function divisionTrail(n, base, maxSteps) {
  if (typeof n !== 'bigint') throw new Error('divisionTrail expects BigInt');
  if (!isValidBase(base)) throw new Error('Bad base');
  var cap = maxSteps || 64;
  var steps = [];
  if (n === 0n) {
    steps.push({ quotientIn: '0', divisor: String(base), quotientOut: '0', remainder: '0', digit: '0' });
    return steps;
  }
  var b = BigInt(base);
  var current = n;
  while (current > 0n && steps.length < cap) {
    var q = current / b;
    var r = current % b;
    var d = DIGITS[Number(r)];
    steps.push({
      quotientIn: String(current),
      divisor: String(base),
      quotientOut: String(q),
      remainder: String(r),
      digit: d
    });
    current = q;
  }
  return steps;
}

var api = {
  DIGITS: DIGITS,
  FIELD_TO_BASE: FIELD_TO_BASE,
  BASE_TO_FIELD: BASE_TO_FIELD,
  isValidBase: isValidBase,
  isValidForBase: isValidForBase,
  toDecimal: toDecimal,
  fromDecimal: fromDecimal,
  exceedsMaxSafeInteger: exceedsMaxSafeInteger,
  convertAll: convertAll,
  convertAllFromArbitrary: convertAllFromArbitrary,
  divisionTrail: divisionTrail,
  baseLabel: baseLabel,
  allowedDigitsHint: allowedDigitsHint
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.NumberBaseConverter = api;
}
