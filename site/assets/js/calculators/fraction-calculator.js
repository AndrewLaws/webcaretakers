'use strict';

/**
 * Fraction Calculator: pure-logic library.
 *
 * Runs entirely in the user's browser. No I/O, no fetch, no server.
 * Every function works on plain {numer, denom} or {whole, numer, denom} objects
 * and returns plain objects, so the page layer can decide how to render them.
 *
 * Sign convention: simplified fractions always carry the sign on the numerator.
 * Denominator is always positive after simplify.
 */

function gcd(a, b) {
  // Euclidean algorithm. Operate on absolute values so the sign of the inputs
  // never changes the result.
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    var t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function toImproper(mixed) {
  // Convert a mixed-number input {whole, numer, denom} into a {numer, denom}
  // improper fraction. The "whole" part carries the sign of the whole quantity.
  // If whole is negative, the entire fraction is negative.
  var whole = Number(mixed.whole) || 0;
  var numer = Number(mixed.numer) || 0;
  var denom = Number(mixed.denom);
  if (!denom || denom === 0) {
    throw new Error('Denominator cannot be zero.');
  }
  // Normalise a negative denominator onto the numerator so the sign is in one place.
  if (denom < 0) {
    denom = -denom;
    numer = -numer;
    whole = -whole;
  }
  // If whole is negative, the whole composite quantity is negative: -(|whole| + numer/denom).
  // We assume numer is given as a non-negative magnitude in mixed input, but
  // we still respect a signed numerator if a user passed one with whole = 0.
  if (whole < 0) {
    return { numer: -(Math.abs(whole) * denom + Math.abs(numer)), denom: denom };
  }
  if (whole > 0) {
    return { numer: whole * denom + Math.abs(numer), denom: denom };
  }
  // whole is zero: numerator's own sign is the result's sign.
  return { numer: numer, denom: denom };
}

function simplify(frac) {
  var numer = frac.numer;
  var denom = frac.denom;
  if (denom === 0) {
    throw new Error('Denominator cannot be zero.');
  }
  if (numer === 0) {
    return { numer: 0, denom: 1 };
  }
  // Keep denominator positive, sign on numerator.
  if (denom < 0) {
    numer = -numer;
    denom = -denom;
  }
  var g = gcd(numer, denom);
  return { numer: numer / g, denom: denom / g };
}

function toMixed(frac) {
  // Convert improper -> mixed for display.
  // Returns { whole, numer, denom, sign } where sign is +1 or -1 and the
  // returned whole/numer/denom are all non-negative magnitudes.
  if (frac.denom === 0) {
    throw new Error('Denominator cannot be zero.');
  }
  var sign = frac.numer < 0 ? -1 : 1;
  var n = Math.abs(frac.numer);
  var d = Math.abs(frac.denom);
  var whole = Math.floor(n / d);
  var rem = n % d;
  return { whole: whole, numer: rem, denom: d, sign: sign };
}

function add(a, b) {
  return simplify({ numer: a.numer * b.denom + b.numer * a.denom, denom: a.denom * b.denom });
}

function subtract(a, b) {
  return simplify({ numer: a.numer * b.denom - b.numer * a.denom, denom: a.denom * b.denom });
}

function multiply(a, b) {
  return simplify({ numer: a.numer * b.numer, denom: a.denom * b.denom });
}

function divide(a, b) {
  if (b.numer === 0) {
    throw new Error('Cannot divide by zero: the second fraction is zero.');
  }
  return simplify({ numer: a.numer * b.denom, denom: a.denom * b.numer });
}

function formatFraction(frac) {
  // Compact text representation of a simple {numer, denom} pair.
  if (frac.numer === 0) return '0';
  if (frac.denom === 1) return String(frac.numer);
  return frac.numer + '/' + frac.denom;
}

function formatMixed(mixed) {
  // Compact text representation of a {whole, numer, denom, sign} mixed number.
  var prefix = mixed.sign < 0 ? '-' : '';
  if (mixed.whole === 0 && mixed.numer === 0) return '0';
  if (mixed.numer === 0) return prefix + mixed.whole;
  if (mixed.whole === 0) return prefix + mixed.numer + '/' + mixed.denom;
  return prefix + mixed.whole + ' ' + mixed.numer + '/' + mixed.denom;
}

function calculate(input) {
  // input: { a: {whole, numer, denom}, b: {whole, numer, denom}, op: '+'|'-'|'*'|'/' }
  // Returns:
  //   {
  //     a: {numer, denom},                      // a as improper, signed
  //     b: {numer, denom},                      // b as improper, signed
  //     commonDenom: number|null,               // for + and -, the LCD path
  //     aOnCommon, bOnCommon,                   // {numer, denom} on common denom (+/- only)
  //     unsimplified: {numer, denom},           // result before gcd reduction
  //     gcdValue: number,                       // gcd applied for simplification
  //     simplified: {numer, denom},             // final simplified fraction
  //     mixed: {whole, numer, denom, sign},     // simplified as a mixed number
  //     decimal: number,                        // simplified.numer / simplified.denom
  //     op: original operator
  //   }
  var aImp = toImproper(input.a);
  var bImp = toImproper(input.b);
  var op = input.op;
  var unsimplified;
  var commonDenom = null;
  var aOnCommon = null;
  var bOnCommon = null;

  switch (op) {
    case '+':
      commonDenom = aImp.denom * bImp.denom;
      aOnCommon = { numer: aImp.numer * bImp.denom, denom: commonDenom };
      bOnCommon = { numer: bImp.numer * aImp.denom, denom: commonDenom };
      unsimplified = { numer: aOnCommon.numer + bOnCommon.numer, denom: commonDenom };
      break;
    case '-':
      commonDenom = aImp.denom * bImp.denom;
      aOnCommon = { numer: aImp.numer * bImp.denom, denom: commonDenom };
      bOnCommon = { numer: bImp.numer * aImp.denom, denom: commonDenom };
      unsimplified = { numer: aOnCommon.numer - bOnCommon.numer, denom: commonDenom };
      break;
    case '*':
    case '\u00d7':
      unsimplified = { numer: aImp.numer * bImp.numer, denom: aImp.denom * bImp.denom };
      break;
    case '/':
    case '\u00f7':
      if (bImp.numer === 0) {
        throw new Error('Cannot divide by zero: the second fraction is zero.');
      }
      unsimplified = { numer: aImp.numer * bImp.denom, denom: aImp.denom * bImp.numer };
      break;
    default:
      throw new Error('Unknown operator: ' + op);
  }

  // Normalise sign onto the numerator before computing gcd / simplifying.
  if (unsimplified.denom < 0) {
    unsimplified.numer = -unsimplified.numer;
    unsimplified.denom = -unsimplified.denom;
  }
  var gcdValue = unsimplified.numer === 0 ? 1 : gcd(unsimplified.numer, unsimplified.denom);
  var simplified = simplify(unsimplified);
  var mixed = toMixed(simplified);
  var decimal = simplified.numer / simplified.denom;

  return {
    a: aImp,
    b: bImp,
    op: op,
    commonDenom: commonDenom,
    aOnCommon: aOnCommon,
    bOnCommon: bOnCommon,
    unsimplified: unsimplified,
    gcdValue: gcdValue,
    simplified: simplified,
    mixed: mixed,
    decimal: decimal,
  };
}

var exported = {
  gcd: gcd,
  toImproper: toImproper,
  toMixed: toMixed,
  simplify: simplify,
  add: add,
  subtract: subtract,
  multiply: multiply,
  divide: divide,
  calculate: calculate,
  formatFraction: formatFraction,
  formatMixed: formatMixed,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.FractionCalc = exported;
}
