'use strict';

/**
 * Roman Numeral Converter: pure logic library.
 *
 * Standard Roman numerals only (1 to 3999). Vinculum overlines for larger
 * values are out of scope and explicitly noted on the page.
 *
 * Two directions:
 *   numberToRoman(n)  : integer 1-3999 to canonical Roman numeral string
 *   romanToNumber(s)  : canonical Roman numeral string to integer
 *
 * Validation: a Roman numeral is considered valid only if round-tripping it
 * back through numberToRoman produces the same uppercase string. That rules
 * out "IIII", "VV", "IC", "XM" and the like, which some clocks and old
 * stonework use but which are not standard.
 */

// The classic 13-token greedy table. Order matters: largest first.
var TOKENS = [
  { roman: 'M',  value: 1000 },
  { roman: 'CM', value: 900  },
  { roman: 'D',  value: 500  },
  { roman: 'CD', value: 400  },
  { roman: 'C',  value: 100  },
  { roman: 'XC', value: 90   },
  { roman: 'L',  value: 50   },
  { roman: 'XL', value: 40   },
  { roman: 'X',  value: 10   },
  { roman: 'IX', value: 9    },
  { roman: 'V',  value: 5    },
  { roman: 'IV', value: 4    },
  { roman: 'I',  value: 1    }
];

var SYMBOL_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function numberToRoman(n) {
  if (typeof n !== 'number' || !isFinite(n)) {
    throw new Error('Enter a whole number.');
  }
  if (!Number.isInteger(n)) {
    throw new Error('Roman numerals can only represent whole numbers.');
  }
  if (n < 1) {
    throw new Error('Roman numerals start at 1. There is no symbol for zero or negatives.');
  }
  if (n > 3999) {
    throw new Error('Standard Roman numerals stop at 3,999 (MMMCMXCIX). Larger values need vinculum overlines, which are out of scope here.');
  }

  var out = '';
  var remaining = n;
  for (var i = 0; i < TOKENS.length; i++) {
    while (remaining >= TOKENS[i].value) {
      out += TOKENS[i].roman;
      remaining -= TOKENS[i].value;
    }
  }
  return out;
}

// Greedy decomposition steps for the prove-it panel.
function numberToRomanSteps(n) {
  var steps = [];
  var remaining = n;
  for (var i = 0; i < TOKENS.length; i++) {
    while (remaining >= TOKENS[i].value) {
      steps.push({
        token: TOKENS[i].roman,
        value: TOKENS[i].value,
        before: remaining,
        after: remaining - TOKENS[i].value
      });
      remaining -= TOKENS[i].value;
    }
  }
  return steps;
}

function romanToNumber(s) {
  if (typeof s !== 'string') {
    throw new Error('Enter a Roman numeral.');
  }
  var trimmed = s.trim();
  if (trimmed === '') {
    throw new Error('Enter a Roman numeral.');
  }
  var upper = trimmed.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(upper)) {
    throw new Error('Roman numerals only use the letters I, V, X, L, C, D and M.');
  }

  var total = 0;
  for (var i = 0; i < upper.length; i++) {
    var here = SYMBOL_VALUES[upper[i]];
    var next = i + 1 < upper.length ? SYMBOL_VALUES[upper[i + 1]] : 0;
    if (here < next) {
      total -= here;
    } else {
      total += here;
    }
  }

  // Round-trip validation: the only way "IIII" or "VV" can pass.
  if (total < 1 || total > 3999) {
    throw new Error('That parses outside the 1 to 3,999 range that standard Roman numerals cover.');
  }
  if (numberToRoman(total) !== upper) {
    throw new Error('That is not a standard Roman numeral. The canonical form would be ' + numberToRoman(total) + '.');
  }
  return total;
}

// Walk-through steps for romanToNumber, used in the prove-it panel.
function romanToNumberSteps(s) {
  var upper = s.trim().toUpperCase();
  var steps = [];
  for (var i = 0; i < upper.length; i++) {
    var here = SYMBOL_VALUES[upper[i]];
    var next = i + 1 < upper.length ? SYMBOL_VALUES[upper[i + 1]] : 0;
    if (here < next) {
      steps.push({
        symbol: upper[i],
        value: here,
        nextSymbol: upper[i + 1],
        nextValue: next,
        op: 'subtract'
      });
    } else {
      steps.push({
        symbol: upper[i],
        value: here,
        nextSymbol: upper[i + 1] || null,
        nextValue: next || null,
        op: 'add'
      });
    }
  }
  return steps;
}

var api = {
  numberToRoman: numberToRoman,
  romanToNumber: romanToNumber,
  numberToRomanSteps: numberToRomanSteps,
  romanToNumberSteps: romanToNumberSteps,
  TOKENS: TOKENS,
  SYMBOL_VALUES: SYMBOL_VALUES
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.RomanNumeralConverter = api;
}
