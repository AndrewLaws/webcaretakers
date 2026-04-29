'use strict';

// Logarithm Calculator
// Computes log_b(x) for any positive base b != 1 and positive x. Supports
// three modes: solve for the log result, solve for x given base and result,
// or solve for the base given x and result. Uses the change-of-base
// identity log_b(x) = ln(x) / ln(b) for the forward computation.

function resolveBase(baseChoice, customBase) {
  if (baseChoice === 'e') return Math.E;
  if (baseChoice === 'custom') return Number(customBase);
  return Number(baseChoice);
}

function isPositiveFinite(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function computeLog(opts) {
  var mode = opts.mode || 'log';

  if (mode === 'log') {
    var value = Number(opts.value);
    var base  = Number(opts.base);
    if (!isPositiveFinite(value)) {
      return { kind: 'invalid', error: 'Value must be a positive number. The logarithm of zero or a negative number is not defined in the real numbers.' };
    }
    if (!isPositiveFinite(base) || base === 1) {
      return { kind: 'invalid', error: 'Base must be positive and not equal to 1.' };
    }
    var result = Math.log(value) / Math.log(base);
    return {
      kind: 'ok',
      mode: mode,
      value: value,
      base: base,
      result: result,
      inverse: Math.pow(base, result),
      lnValue: Math.log(value),
      lnBase: Math.log(base)
    };
  }

  if (mode === 'value') {
    var b = Number(opts.base);
    var r = Number(opts.logResult);
    if (!isPositiveFinite(b) || b === 1) {
      return { kind: 'invalid', error: 'Base must be positive and not equal to 1.' };
    }
    if (!Number.isFinite(r)) {
      return { kind: 'invalid', error: 'Log result must be a number.' };
    }
    var x = Math.pow(b, r);
    return {
      kind: 'ok',
      mode: mode,
      base: b,
      logResult: r,
      result: x,
      inverse: r
    };
  }

  if (mode === 'base') {
    var v = Number(opts.value);
    var lr = Number(opts.logResult);
    if (!isPositiveFinite(v)) {
      return { kind: 'invalid', error: 'Value must be a positive number.' };
    }
    if (!Number.isFinite(lr) || lr === 0) {
      return { kind: 'invalid', error: 'Log result must be a non-zero number when solving for the base.' };
    }
    var solvedBase = Math.pow(v, 1 / lr);
    return {
      kind: 'ok',
      mode: mode,
      value: v,
      logResult: lr,
      result: solvedBase,
      inverse: Math.pow(solvedBase, lr)
    };
  }

  return { kind: 'invalid', error: 'Unknown mode.' };
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  // Whole-number short-circuit: avoids printing 3.0000000000000 for tidy answers.
  if (Math.abs(n - Math.round(n)) < 1e-12) return String(Math.round(n));
  // Up to 12 significant digits, trim trailing zeros.
  var s = n.toPrecision(12);
  if (s.indexOf('.') !== -1 && s.indexOf('e') === -1) {
    s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  return s;
}

if (typeof module !== 'undefined') {
  module.exports = {
    computeLog: computeLog,
    resolveBase: resolveBase,
    formatNumber: formatNumber
  };
}
if (typeof window !== 'undefined') {
  window.LogarithmCalculator = {
    computeLog: computeLog,
    resolveBase: resolveBase,
    formatNumber: formatNumber
  };
}
