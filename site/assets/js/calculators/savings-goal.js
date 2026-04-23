'use strict';

/**
 * Savings Goal Calculator.
 *
 * Given a target amount, a starting balance, a target date (or number of
 * months), and an optional annual interest rate, work out the monthly
 * contribution required to hit the target.
 *
 * Assumes monthly compounding and end-of-month contributions (annuity-
 * immediate). This is the convention most consumer savings tools use.
 *
 * Formula (FV of PV plus FV of annuity):
 *   FV = PV × (1+r)^n + PMT × [((1+r)^n - 1) / r]
 *
 * Solving for PMT:
 *   PMT = (FV - PV × (1+r)^n) / [((1+r)^n - 1) / r]
 *
 * With zero interest the formula collapses to:
 *   PMT = (FV - PV) / n
 */

function parseYMD(str) {
  if (typeof str !== 'string') return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  return { y: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10) };
}

function monthsBetween(from, to) {
  // Inclusive-ish: whole calendar months from 'from' up to 'to'.
  // If to is on or after the from day-of-month, count the current month.
  var months = (to.y - from.y) * 12 + (to.m - from.m);
  if (to.d < from.d) months--;
  return months;
}

function calculateSavingsGoal(opts) {
  opts = opts || {};
  var target  = Number(opts.targetAmount);
  var start   = opts.startingBalance == null ? 0 : Number(opts.startingBalance);
  var apr     = opts.annualInterestRate == null ? 0 : Number(opts.annualInterestRate);
  var months;

  if (opts.months != null) {
    months = Math.round(Number(opts.months));
  } else if (opts.startDate && opts.targetDate) {
    var f = typeof opts.startDate === 'string' ? parseYMD(opts.startDate) : opts.startDate;
    var t = typeof opts.targetDate === 'string' ? parseYMD(opts.targetDate) : opts.targetDate;
    if (!f || !t) throw new Error('Invalid date(s)');
    months = monthsBetween(f, t);
  } else {
    throw new Error('Provide either months or startDate + targetDate');
  }

  if (!isFinite(target) || target <= 0) throw new Error('Target amount must be greater than zero');
  if (!isFinite(start) || start < 0)     throw new Error('Starting balance cannot be negative');
  if (!isFinite(apr)   || apr < 0)       throw new Error('Interest rate cannot be negative');
  if (!isFinite(months) || months < 1)   throw new Error('Target date must be at least one month in the future');
  if (start >= target)                   throw new Error('You have already reached the target');

  var r = apr / 100 / 12;  // monthly rate
  var growth = Math.pow(1 + r, months);
  var projectedFromStart = start * growth;

  var pmt;
  if (r === 0) {
    pmt = (target - start) / months;
  } else {
    pmt = (target - projectedFromStart) / ((growth - 1) / r);
  }

  // Totals
  var totalContributions = pmt * months;
  var finalStartValue    = projectedFromStart;
  var finalContribValue  = r === 0 ? totalContributions : pmt * ((growth - 1) / r);
  var interestEarned     = (finalStartValue + finalContribValue) - (start + totalContributions);

  return {
    monthlyContribution: round2(pmt),
    months:              months,
    years:               +(months / 12).toFixed(2),
    totalContributions:  round2(totalContributions),
    interestEarned:      round2(interestEarned),
    finalBalance:        round2(finalStartValue + finalContribValue),
    startingBalance:     round2(start),
    targetAmount:        round2(target),
    annualInterestRate:  apr,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateSavingsGoal, monthsBetween, parseYMD };
} else {
  window.SavingsGoal = { calculateSavingsGoal, monthsBetween, parseYMD };
}
