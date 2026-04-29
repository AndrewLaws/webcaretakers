(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CombinationsPermutations = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Cap n at a sensible ceiling. Above this the result is fine to compute as a
  // BigInt but the digit count alone (n=500 factorial is over 1100 digits)
  // starts to bog down the renderer and offer the reader nothing useful.
  var MAX_N = 500;

  function factorial(n) {
    if (typeof n !== 'bigint') n = BigInt(n);
    if (n < 0n) throw new Error('Factorial is not defined for negative integers.');
    var result = 1n;
    for (var i = 2n; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  function combinations(n, r) {
    n = BigInt(n);
    r = BigInt(r);
    if (r < 0n || n < 0n) throw new Error('n and r must be zero or positive.');
    if (r > n) return 0n;
    // Use the multiplicative formula to avoid computing a huge factorial just to divide it away.
    if (r > n - r) r = n - r;
    var num = 1n;
    var den = 1n;
    for (var i = 1n; i <= r; i++) {
      num *= (n - r + i);
      den *= i;
    }
    return num / den;
  }

  function permutations(n, r) {
    n = BigInt(n);
    r = BigInt(r);
    if (r < 0n || n < 0n) throw new Error('n and r must be zero or positive.');
    if (r > n) return 0n;
    var result = 1n;
    for (var i = 0n; i < r; i++) {
      result *= (n - i);
    }
    return result;
  }

  // Combinations with repetition: C(n + r - 1, r). The classic stars-and-bars count.
  function combinationsWithRepetition(n, r) {
    n = BigInt(n);
    r = BigInt(r);
    if (n < 0n || r < 0n) throw new Error('n and r must be zero or positive.');
    if (n === 0n && r === 0n) return 1n;
    if (n === 0n) return 0n;
    return combinations(n + r - 1n, r);
  }

  // Permutations with repetition: n^r.
  function permutationsWithRepetition(n, r) {
    n = BigInt(n);
    r = BigInt(r);
    if (n < 0n || r < 0n) throw new Error('n and r must be zero or positive.');
    return n ** r;
  }

  function multinomial(groups) {
    if (!Array.isArray(groups) || groups.length === 0) {
      throw new Error('Multinomial needs at least one group size.');
    }
    var total = 0n;
    for (var i = 0; i < groups.length; i++) {
      var g = BigInt(groups[i]);
      if (g < 0n) throw new Error('Group sizes must be zero or positive.');
      total += g;
    }
    var num = factorial(total);
    var den = 1n;
    for (var j = 0; j < groups.length; j++) {
      den *= factorial(BigInt(groups[j]));
    }
    return { value: num / den, n: total, groups: groups.map(function (g) { return BigInt(g); }) };
  }

  function parseGroups(str) {
    if (typeof str !== 'string') return [];
    var out = [];
    var parts = str.split(',');
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].trim();
      if (t === '') continue;
      if (!/^\d+$/.test(t)) throw new Error('Group sizes must be non-negative whole numbers.');
      out.push(parseInt(t, 10));
    }
    return out;
  }

  function validateNR(n, r, opts) {
    opts = opts || {};
    if (!Number.isInteger(n) || n < 0) throw new Error('n must be a non-negative whole number.');
    if (n > MAX_N) throw new Error('n must be ' + MAX_N + ' or less to keep the page snappy.');
    if (opts.requireR) {
      if (!Number.isInteger(r) || r < 0) throw new Error('r must be a non-negative whole number.');
      if (!opts.allowRepetition && r > n) throw new Error('r cannot be greater than n without repetition.');
      if (r > MAX_N) throw new Error('r must be ' + MAX_N + ' or less.');
    }
  }

  function compute(input) {
    var mode = input.mode || 'combinations';
    var repetition = !!input.repetition;
    var n = input.n;
    var r = input.r;

    if (mode === 'multinomial') {
      var groups = Array.isArray(input.multinomialGroups)
        ? input.multinomialGroups
        : parseGroups(input.multinomialGroups);
      var sum = groups.reduce(function (a, b) { return a + b; }, 0);
      if (sum > MAX_N) throw new Error('Group total must be ' + MAX_N + ' or less.');
      var m = multinomial(groups);
      return {
        mode: 'multinomial',
        groups: groups,
        n: Number(m.n),
        multinomial: m.value,
        formula: 'n! / (k1! * k2! * ... * km!)',
      };
    }

    if (mode === 'factorial-only') {
      validateNR(n, r, { requireR: false });
      return {
        mode: 'factorial-only',
        n: n,
        factorialN: factorial(n),
        formula: 'n!',
      };
    }

    validateNR(n, r, { requireR: true, allowRepetition: repetition });

    var out = {
      mode: mode,
      repetition: repetition,
      n: n,
      r: r,
      factorialN: factorial(n),
      factorialR: factorial(r),
      factorialNminusR: r <= n ? factorial(n - r) : null,
    };

    if (mode === 'combinations' || mode === 'both') {
      out.nCr = repetition ? combinationsWithRepetition(n, r) : combinations(n, r);
      out.formulaC = repetition
        ? 'C(n + r - 1, r) = (n + r - 1)! / (r! * (n - 1)!)'
        : 'nCr = n! / (r! * (n - r)!)';
    }
    if (mode === 'permutations' || mode === 'both') {
      out.nPr = repetition ? permutationsWithRepetition(n, r) : permutations(n, r);
      out.formulaP = repetition
        ? 'P(n, r) with repetition = n^r'
        : 'nPr = n! / (n - r)!';
    }

    return out;
  }

  // Format a BigInt with thousands separators and, if very long, an exponent hint.
  function formatBig(value) {
    if (typeof value !== 'bigint') value = BigInt(value);
    var s = value.toString();
    var negative = s.charAt(0) === '-';
    if (negative) s = s.slice(1);
    var withCommas = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var formatted = (negative ? '-' : '') + withCommas;
    if (s.length > 30) {
      // Add a scientific-style hint so very large numbers are easier to compare.
      var exp = s.length - 1;
      var lead = s.charAt(0) + (s.length > 1 ? '.' + s.substr(1, 4) : '');
      formatted += ' (~' + lead + 'e+' + exp + ')';
    }
    return formatted;
  }

  return {
    MAX_N: MAX_N,
    factorial: factorial,
    combinations: combinations,
    permutations: permutations,
    combinationsWithRepetition: combinationsWithRepetition,
    permutationsWithRepetition: permutationsWithRepetition,
    multinomial: multinomial,
    parseGroups: parseGroups,
    compute: compute,
    formatBig: formatBig,
  };
}));
