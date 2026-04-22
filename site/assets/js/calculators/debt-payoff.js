'use strict';

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate how long it takes to pay off a debt, and how much interest is paid.
 *
 * Formula for number of months:
 *   n = -log(1 - r × P / M) / log(1 + r)
 * where P = principal, r = monthly rate (APR / 12 / 100), M = monthly payment
 *
 * @param {object} opts
 * @param {number} opts.balance           - Current balance (£)
 * @param {number} opts.apr               - Annual percentage rate (%)
 * @param {number} opts.monthlyPayment    - Monthly payment (£)
 * @param {number} [opts.extraPayment]    - Optional extra payment on top of monthlyPayment (£)
 */
function calculateDebtPayoff({ balance, apr, monthlyPayment, extraPayment }) {
  if (typeof balance !== 'number' || balance <= 0)         throw new Error('balance must be a positive number');
  if (typeof apr !== 'number' || apr < 0)                  throw new Error('apr must be a non-negative number');
  if (typeof monthlyPayment !== 'number' || monthlyPayment <= 0) throw new Error('monthlyPayment must be a positive number');

  var extra = (typeof extraPayment === 'number' && extraPayment > 0) ? extraPayment : 0;

  var monthlyRate = apr / 100 / 12;

  // Guard: payment must exceed first month's interest or it will never pay off
  var firstMonthInterest = round2(balance * monthlyRate);
  if (monthlyPayment <= firstMonthInterest && apr > 0) {
    throw new Error('Monthly payment does not cover interest. Increase the payment to make progress on the balance.');
  }

  function calcMonths(pmt) {
    if (monthlyRate === 0) {
      // Zero-interest: simple division
      return Math.ceil(balance / pmt);
    }
    // n = -ln(1 - r×P/M) / ln(1+r)
    var ratio = (monthlyRate * balance) / pmt;
    if (ratio >= 1) return Infinity; // Payment can never cover interest
    return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + monthlyRate));
  }

  function calcTotalInterest(pmt, months) {
    // Simulate month-by-month to get exact interest (ceiling on months means last payment is smaller)
    var bal = balance;
    var totalInterest = 0;
    for (var i = 0; i < months; i++) {
      var interest = round2(bal * monthlyRate);
      totalInterest += interest;
      var principal = Math.min(pmt - interest, bal);
      bal = round2(bal - principal);
      if (bal <= 0) break;
    }
    return round2(totalInterest);
  }

  var baseMonths         = calcMonths(monthlyPayment);
  var baseTotalInterest  = calcTotalInterest(monthlyPayment, baseMonths);
  var baseTotalPaid      = round2(baseTotalInterest + balance);

  var result = {
    balance:          round2(balance),
    apr,
    monthlyPayment:   round2(monthlyPayment),
    extraPayment:     round2(extra),
    monthlyRate:      round2(monthlyRate * 100 * 100) / 100, // monthly rate as %
    firstMonthInterest,
    firstMonthPrincipal: round2(monthlyPayment - firstMonthInterest),
    months:           baseMonths,
    years:            Math.floor(baseMonths / 12),
    remainingMonths:  baseMonths % 12,
    totalInterest:    baseTotalInterest,
    totalPaid:        baseTotalPaid,
    withExtra:        null,
  };

  if (extra > 0) {
    var pmt2           = monthlyPayment + extra;
    var months2        = calcMonths(pmt2);
    var interest2      = calcTotalInterest(pmt2, months2);
    var totalPaid2     = round2(interest2 + balance);
    var monthsSaved    = baseMonths - months2;
    var interestSaved  = round2(baseTotalInterest - interest2);

    result.withExtra = {
      extraPayment:   round2(extra),
      totalMonthly:   round2(pmt2),
      months:         months2,
      years:          Math.floor(months2 / 12),
      remainingMonths: months2 % 12,
      totalInterest:  interest2,
      totalPaid:      totalPaid2,
      monthsSaved,
      yearsSaved:     Math.floor(monthsSaved / 12),
      extraMonthsSaved: monthsSaved % 12,
      interestSaved,
    };
  }

  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDebtPayoff };
} else {
  window.DebtPayoff = { calculateDebtPayoff };
}
