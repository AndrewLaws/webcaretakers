'use strict';

/**
 * GCD and LCM Calculator: pure-logic library.
 *
 * Runs entirely in the user's browser. No fetch, no I/O, no server.
 *
 * Implementation notes:
 *  - GCD via the Euclidean algorithm: gcd(a, b) = gcd(b, a mod b), recursing
 *    until b = 0. Generalised to n inputs by reducing pairwise.
 *  - LCM(a, b) = (a * b) / gcd(a, b). Generalised pairwise too. To avoid
 *    overflow we divide before multiplying: a / gcd(a, b) * b.
 *  - Prime factorisation by trial division up to sqrt(n). For inputs up to
 *    1e12 this is fast enough on modern hardware (well under a second).
 *
 * Bounds:
 *  - At least 2 inputs, at most 10 inputs.
 *  - Each value: positive integer, no greater than MAX_VALUE (1e12).
 *  - JavaScript can represent integers up to 2^53 - 1 exactly. The LCM of
 *    ten coprime values up to 1e12 could in theory exceed that, so the
 *    library flags any LCM that loses precision rather than returning a
 *    silently-wrong number.
 */

var MAX_VALUE = 1e12;
var MAX_INPUTS = 10;

function parseIntegers(input) {
  // Accepts comma, whitespace and semicolon as delimiters. Each token must be
  // a positive integer (no decimals, no negatives, no zero, no scientific
  // notation since 1e3 etc. invite confusion in this context).
  if (input === null || input === undefined) {
    return { values: [], invalid: [] };
  }
  var text = String(input).trim();
  if (text === '') {
    return { values: [], invalid: [] };
  }
  var tokens = text.split(/[\s,;]+/).filter(function (t) { return t !== ''; });
  var values = [];
  var invalid = [];
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (/^\d+$/.test(t)) {
      var n = Number(t);
      if (Number.isFinite(n) && Number.isInteger(n) && n >= 1) {
        values.push(n);
      } else {
        invalid.push(t);
      }
    } else {
      invalid.push(t);
    }
  }
  return { values: values, invalid: invalid };
}

function gcd(a, b) {
  // Iterative Euclidean algorithm. Inputs assumed positive integers.
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    var r = a % b;
    a = b;
    b = r;
  }
  return a;
}

function gcdMany(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  var g = values[0];
  for (var i = 1; i < values.length; i++) {
    g = gcd(g, values[i]);
    if (g === 1) return 1; // early exit: gcd cannot drop below 1
  }
  return g;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  // Divide first to keep the intermediate value smaller.
  return (a / gcd(a, b)) * b;
}

function lcmMany(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  var l = values[0];
  for (var i = 1; i < values.length; i++) {
    l = lcm(l, values[i]);
  }
  return l;
}

function primeFactorise(n) {
  // Returns [{prime, power}, ...] in ascending prime order.
  // Trial division up to sqrt(n); whatever remains above 1 is itself prime.
  if (n < 2) return [];
  var factors = [];
  var remaining = n;
  // Pull out 2 first, then odd candidates.
  if (remaining % 2 === 0) {
    var p2 = 0;
    while (remaining % 2 === 0) { remaining /= 2; p2 += 1; }
    factors.push({ prime: 2, power: p2 });
  }
  var d = 3;
  while (d * d <= remaining) {
    if (remaining % d === 0) {
      var p = 0;
      while (remaining % d === 0) { remaining /= d; p += 1; }
      factors.push({ prime: d, power: p });
    }
    d += 2;
  }
  if (remaining > 1) {
    factors.push({ prime: remaining, power: 1 });
  }
  return factors;
}

function euclideanSteps(a, b) {
  // Returns the trail of (a, b, quotient, remainder) reductions, ending at
  // (g, 0). The final entry's `a` is the gcd.
  var steps = [];
  a = Math.abs(a);
  b = Math.abs(b);
  if (a < b) {
    var t = a; a = b; b = t;
  }
  // Handle the b = 0 case explicitly so the table always shows at least one row.
  if (b === 0) {
    steps.push({ a: a, b: 0, quotient: null, remainder: null });
    return steps;
  }
  while (b !== 0) {
    var q = Math.floor(a / b);
    var r = a % b;
    steps.push({ a: a, b: b, quotient: q, remainder: r });
    a = b;
    b = r;
  }
  // Add a final cap row showing gcd(g, 0) = g for clarity.
  steps.push({ a: a, b: 0, quotient: null, remainder: null });
  return steps;
}

function combinedFactorisation(values) {
  // For each prime appearing in any input's factorisation, record the
  // minimum and maximum power across all inputs. Min powers reconstruct
  // the GCD, max powers reconstruct the LCM.
  var perInput = values.map(primeFactorise);
  var primesSeen = {};
  for (var i = 0; i < perInput.length; i++) {
    for (var j = 0; j < perInput[i].length; j++) {
      primesSeen[perInput[i][j].prime] = true;
    }
  }
  var primes = Object.keys(primesSeen).map(Number).sort(function (a, b) { return a - b; });
  var rows = [];
  for (var k = 0; k < primes.length; k++) {
    var p = primes[k];
    var powers = [];
    for (var ii = 0; ii < perInput.length; ii++) {
      var match = perInput[ii].find(function (f) { return f.prime === p; });
      powers.push(match ? match.power : 0);
    }
    var minP = powers[0];
    var maxP = powers[0];
    for (var z = 1; z < powers.length; z++) {
      if (powers[z] < minP) minP = powers[z];
      if (powers[z] > maxP) maxP = powers[z];
    }
    rows.push({ prime: p, powers: powers, minPower: minP, maxPower: maxP });
  }
  return rows;
}

function compute(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { ok: false, error: 'Enter at least two positive whole numbers.' };
  }
  if (values.length < 2) {
    return { ok: false, error: 'Need at least two numbers to find a GCD or LCM.' };
  }
  if (values.length > MAX_INPUTS) {
    return { ok: false, error: 'Use no more than ' + MAX_INPUTS + ' numbers at once.' };
  }
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!Number.isInteger(v) || v < 1) {
      return { ok: false, error: 'Each number must be a positive whole number (1 or larger).' };
    }
    if (v > MAX_VALUE) {
      return { ok: false, error: 'Values above 1,000,000,000,000 are too large for fast factorisation here.' };
    }
  }

  var g = gcdMany(values);
  var l = lcmMany(values);

  // Pairwise trail for 3+ inputs (so the user can follow how the reduction proceeds).
  var pairwiseGcd = [];
  var pairwiseLcm = [];
  if (values.length > 2) {
    var rg = values[0];
    var rl = values[0];
    for (var k = 1; k < values.length; k++) {
      var nextG = gcd(rg, values[k]);
      var nextL = lcm(rl, values[k]);
      pairwiseGcd.push({ left: rg, right: values[k], result: nextG });
      pairwiseLcm.push({ left: rl, right: values[k], result: nextL });
      rg = nextG;
      rl = nextL;
    }
  }

  var factorisations = values.map(function (v) {
    return { value: v, factors: primeFactorise(v) };
  });

  var combined = combinedFactorisation(values);

  // Euclidean trail is most useful for two inputs. For 3+ we still show the
  // first pair's trail to demonstrate the algorithm.
  var eucSteps = euclideanSteps(values[0], values[1]);

  var lcmExact = Number.isSafeInteger(l);

  return {
    ok: true,
    values: values.slice(),
    gcd: g,
    lcm: l,
    lcmExact: lcmExact,
    factorisations: factorisations,
    combined: combined,
    euclideanSteps: eucSteps,
    pairwiseGcd: pairwiseGcd,
    pairwiseLcm: pairwiseLcm,
  };
}

var exported = {
  MAX_VALUE: MAX_VALUE,
  MAX_INPUTS: MAX_INPUTS,
  parseIntegers: parseIntegers,
  gcd: gcd,
  gcdMany: gcdMany,
  lcm: lcm,
  lcmMany: lcmMany,
  primeFactorise: primeFactorise,
  euclideanSteps: euclideanSteps,
  combinedFactorisation: combinedFactorisation,
  compute: compute,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.GcdLcmCalc = exported;
}
