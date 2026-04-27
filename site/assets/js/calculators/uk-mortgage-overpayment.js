'use strict';

// UK Mortgage Overpayment calculator: pure-logic helpers.
//
// Given a current outstanding balance, an annual rate, a remaining term,
// and an overpayment plan (regular monthly extra plus optional one-off in
// month 1), simulate the amortisation month by month and report the
// interest saved and the time shaved off compared with making no
// overpayments at all.
//
// The contractual monthly payment is fixed using the standard repayment
// formula on the starting balance, original rate, and remaining term in
// months. Lenders treat overpayments as principal reductions: the
// contractual payment does not change, the loan just clears earlier.
//
// All money figures are rounded to 2 decimals on output. The internal
// simulation uses full precision to avoid drift on long terms.

function round2(n) {
  return Math.round(n * 100) / 100;
}

function assertPositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(name + ' must be a positive number');
  }
}

function assertNonNegative(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(name + ' must be zero or positive');
  }
}

// Standard monthly repayment formula. Accepts the rate as an annual
// percentage (e.g. 4.5 for 4.5%).
function monthlyPayment(balance, annualRatePercent, termMonths) {
  if (!(balance > 0)) return 0;
  if (!(termMonths > 0)) return 0;
  var r = annualRatePercent / 100 / 12;
  if (r === 0) return balance / termMonths;
  var g = Math.pow(1 + r, termMonths);
  return (balance * r * g) / (g - 1);
}

// Run the amortisation forward, with an optional regular monthly
// overpayment and an optional one-off overpayment applied in month 1.
//
// Returns:
//   months        - whole months until balance hits zero
//   totalInterest - total interest paid across the simulation
//   totalPaid     - total cash out (interest + principal + overpayments)
//   schedule      - array of { month, interest, principal, overpayment, balance }
//
// The simulation stops as soon as the balance would go to zero or below.
// In the final month, the contractual payment is reduced to clear the
// remaining balance exactly (so totalInterest stays accurate).
function simulate(opts) {
  var balance = opts.balance;
  var annualRatePercent = opts.annualRatePercent;
  var termMonths = opts.termMonths;
  var monthlyOverpayment = opts.monthlyOverpayment || 0;
  var oneOffOverpayment = opts.oneOffOverpayment || 0;

  assertPositive(balance, 'balance');
  assertNonNegative(annualRatePercent, 'annualRatePercent');
  assertPositive(termMonths, 'termMonths');
  assertNonNegative(monthlyOverpayment, 'monthlyOverpayment');
  assertNonNegative(oneOffOverpayment, 'oneOffOverpayment');

  var payment = monthlyPayment(balance, annualRatePercent, termMonths);
  var r = annualRatePercent / 100 / 12;

  var b = balance;
  var totalInterest = 0;
  var totalPaid = 0;
  var schedule = [];

  // Hard ceiling: the simulation will never run longer than the
  // contractual term, so this loop is bounded. We also stop early when
  // the balance hits zero.
  for (var m = 1; m <= termMonths; m++) {
    var interest = b * r;
    var principal = payment - interest;
    if (principal < 0) principal = 0; // pathological zero-rate edge

    var overpaymentThisMonth = monthlyOverpayment + (m === 1 ? oneOffOverpayment : 0);

    // Cap principal + overpayment at the remaining balance so we don't
    // overshoot zero in the final month.
    var totalReduction = principal + overpaymentThisMonth;
    var actualPrincipal = principal;
    var actualOverpayment = overpaymentThisMonth;
    if (totalReduction >= b) {
      // Take principal first, then overpayment, only as much as needed.
      if (principal >= b) {
        actualPrincipal = b;
        actualOverpayment = 0;
      } else {
        actualPrincipal = principal;
        actualOverpayment = b - principal;
      }
    }

    var cashOut = interest + actualPrincipal + actualOverpayment;
    b = b - actualPrincipal - actualOverpayment;
    totalInterest += interest;
    totalPaid += cashOut;

    schedule.push({
      month: m,
      interest: interest,
      principal: actualPrincipal,
      overpayment: actualOverpayment,
      balance: b < 0 ? 0 : b,
    });

    if (b <= 0.005) {
      b = 0;
      break;
    }
  }

  return {
    months: schedule.length,
    monthlyPayment: payment,
    totalInterest: totalInterest,
    totalPaid: totalPaid,
    schedule: schedule,
  };
}

// Top-level convenience: run both scenarios (no overpayment vs the
// supplied overpayment plan) and return a comparison.
function calculateOverpayment(args) {
  var balance = args.balance;
  var annualRatePercent = args.annualRatePercent;
  var termYears = args.termYears || 0;
  var termExtraMonths = args.termExtraMonths || 0;
  var monthlyOverpayment = args.monthlyOverpayment || 0;
  var oneOffOverpayment = args.oneOffOverpayment || 0;
  var startDate = args.startDate || null; // optional; for finish-date output

  assertPositive(balance, 'balance');
  assertNonNegative(annualRatePercent, 'annualRatePercent');
  assertNonNegative(termYears, 'termYears');
  assertNonNegative(termExtraMonths, 'termExtraMonths');
  assertNonNegative(monthlyOverpayment, 'monthlyOverpayment');
  assertNonNegative(oneOffOverpayment, 'oneOffOverpayment');

  var termMonths = Math.round(termYears * 12 + termExtraMonths);
  if (termMonths <= 0) {
    throw new Error('termMonths must be a positive number');
  }

  var baseline = simulate({
    balance: balance,
    annualRatePercent: annualRatePercent,
    termMonths: termMonths,
    monthlyOverpayment: 0,
    oneOffOverpayment: 0,
  });

  var withOver = simulate({
    balance: balance,
    annualRatePercent: annualRatePercent,
    termMonths: termMonths,
    monthlyOverpayment: monthlyOverpayment,
    oneOffOverpayment: oneOffOverpayment,
  });

  var monthsSaved = baseline.months - withOver.months;
  var interestSaved = baseline.totalInterest - withOver.totalInterest;

  // Yearly snapshots, both scenarios, end-of-year balance.
  var snapshots = buildYearlySnapshots(baseline.schedule, withOver.schedule);

  // Optional finish dates if a start date was supplied.
  var finishBaseline = null;
  var finishWithOver = null;
  if (startDate instanceof Date && !isNaN(startDate.getTime())) {
    finishBaseline = addMonthsToDate(startDate, baseline.months);
    finishWithOver = addMonthsToDate(startDate, withOver.months);
  }

  return {
    termMonths: termMonths,
    monthlyPayment: round2(baseline.monthlyPayment),
    baseline: {
      months: baseline.months,
      totalInterest: round2(baseline.totalInterest),
      totalPaid: round2(baseline.totalPaid),
    },
    withOverpayment: {
      months: withOver.months,
      totalInterest: round2(withOver.totalInterest),
      totalPaid: round2(withOver.totalPaid),
      monthlyOverpayment: round2(monthlyOverpayment),
      oneOffOverpayment: round2(oneOffOverpayment),
    },
    interestSaved: round2(interestSaved),
    monthsSaved: monthsSaved,
    yearsSavedWhole: Math.floor(monthsSaved / 12),
    monthsSavedRemainder: monthsSaved % 12,
    finishBaseline: finishBaseline,
    finishWithOverpayment: finishWithOver,
    snapshots: snapshots,
    // Expose 12-month worked example for prove-it.
    firstYearBaseline: baseline.schedule.slice(0, 12).map(roundRow),
    firstYearWithOverpayment: withOver.schedule.slice(0, 12).map(roundRow),
  };
}

function roundRow(row) {
  return {
    month: row.month,
    interest: round2(row.interest),
    principal: round2(row.principal),
    overpayment: round2(row.overpayment),
    balance: round2(row.balance),
  };
}

function buildYearlySnapshots(baseSchedule, overSchedule) {
  var maxMonths = Math.max(baseSchedule.length, overSchedule.length);
  var maxYears = Math.ceil(maxMonths / 12);
  var snapshots = [];
  for (var y = 1; y <= maxYears; y++) {
    var idx = y * 12 - 1; // last month of that year (0-indexed)
    var baseBal = idx < baseSchedule.length
      ? baseSchedule[idx].balance
      : 0;
    var overBal = idx < overSchedule.length
      ? overSchedule[idx].balance
      : 0;
    snapshots.push({
      year: y,
      baselineBalance: round2(baseBal),
      overpaymentBalance: round2(overBal),
    });
  }
  return snapshots;
}

function addMonthsToDate(date, months) {
  var d = new Date(date.getTime());
  // Set day to 1 first to avoid month-end overflow weirdness, then re-set.
  var originalDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp back to original day or month-end, whichever is smaller.
  var lastDayOfNewMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, lastDayOfNewMonth));
  return d;
}

var exported = {
  calculateOverpayment: calculateOverpayment,
  simulate: simulate,
  monthlyPayment: monthlyPayment,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.UkMortgageOverpaymentCalc = exported;
}
