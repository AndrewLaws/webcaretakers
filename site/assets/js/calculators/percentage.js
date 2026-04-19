// Percentage calculator: three modes covering the common search variants.
// All functions return raw numbers; the page layer formats for display.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function percentageOf(percent, value) {
  return round2((percent / 100) * value);
}

function whatPercentIs(part, whole) {
  if (whole === 0) throw new Error('Cannot divide by zero: the "of" value must not be 0.');
  return round2((part / whole) * 100);
}

function percentageChange(from, to) {
  if (from === 0) throw new Error('Cannot calculate change from zero: the starting value must not be 0.');
  return round2(((to - from) / from) * 100);
}

function calculate({ mode, a, b }) {
  switch (mode) {
    case 'percent-of':   return percentageOf(a, b);
    case 'what-percent': return whatPercentIs(a, b);
    case 'change':       return percentageChange(a, b);
    default: throw new Error(`Unknown mode: ${mode}`);
  }
}

const exported = { percentageOf, whatPercentIs, percentageChange, calculate };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.PercentageCalc = exported;
}
