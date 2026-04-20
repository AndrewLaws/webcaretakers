'use strict';

// Pure-logic compound interest module.
// Country-neutral: caller supplies currency in the UI layer.
//
// Simulation approach:
// - We collapse everything to a "periods per year" for the compounding step.
//   * annually  -> 1
//   * monthly   -> 12
//   * daily     -> 365 (then convert to an effective monthly rate for iteration)
// - Contributions are either monthly or annually. We iterate on a cadence
//   that matches the more frequent of compounding and contribution so we
//   don't lose precision.
// - 'daily' compounding is approximated by using the equivalent monthly
//   rate: (1 + r/365)^(365/12) - 1. That keeps the iteration cheap while
//   matching a daily-compounded balance to within a pound over decades.

function effectiveMonthlyRate(annualRate, compoundingFrequency) {
  if (annualRate === 0) return 0;
  if (compoundingFrequency === 'monthly') return annualRate / 12;
  if (compoundingFrequency === 'annually') {
    return Math.pow(1 + annualRate, 1 / 12) - 1;
  }
  if (compoundingFrequency === 'daily') {
    return Math.pow(1 + annualRate / 365, 365 / 12) - 1;
  }
  throw new Error('Unknown compoundingFrequency: ' + compoundingFrequency);
}

function calculateCompoundInterest(opts) {
  const {
    principal,
    annualRatePercent,
    years,
    compoundingFrequency = 'monthly',
    contribution = 0,
    contributionFrequency = 'monthly',
    contributionTiming = 'end',
    inflationRatePercent = 0,
  } = opts || {};

  if (!(principal >= 0)) throw new Error('principal must be >= 0');
  if (!(years > 0)) throw new Error('years must be > 0');
  if (!(annualRatePercent >= 0)) throw new Error('annualRatePercent must be >= 0');
  if (!(contribution >= 0)) throw new Error('contribution must be >= 0');

  const r = annualRatePercent / 100;
  const inflation = inflationRatePercent / 100;

  // Annual-compounding + annual contributions: iterate year by year directly
  // to avoid the fractional-month approximation for this common case.
  if (compoundingFrequency === 'annually' && contributionFrequency === 'annually') {
    let balance = principal;
    let totalContributions = 0;
    const yearByYear = [];
    for (let y = 1; y <= years; y++) {
      if (contributionTiming === 'start') {
        balance += contribution;
        totalContributions += contribution;
      }
      balance = balance * (1 + r);
      if (contributionTiming === 'end') {
        balance += contribution;
        totalContributions += contribution;
      }
      yearByYear.push({
        year: y,
        balance: round2(balance),
        contributions: round2(totalContributions),
        interest: round2(balance - principal - totalContributions),
      });
    }
    return finish({
      principal, annualRatePercent, years,
      balance, totalContributions, yearByYear, inflation,
    });
  }

  // Otherwise iterate monthly.
  const rm = effectiveMonthlyRate(r, compoundingFrequency);
  const months = Math.round(years * 12);
  let balance = principal;
  let totalContributions = 0;
  const yearByYear = [];

  for (let m = 1; m <= months; m++) {
    let thisMonthContribution = 0;
    if (contributionFrequency === 'monthly') {
      thisMonthContribution = contribution;
    } else if (contributionFrequency === 'annually') {
      // Deposit the annual amount in December (month 12, 24, ...).
      // 'start' timing: deposit in January of that year instead.
      if (contributionTiming === 'start' && m % 12 === 1) {
        thisMonthContribution = contribution;
      } else if (contributionTiming === 'end' && m % 12 === 0) {
        thisMonthContribution = contribution;
      }
    }

    if (contributionTiming === 'start') {
      balance += thisMonthContribution;
      totalContributions += thisMonthContribution;
      balance = balance * (1 + rm);
    } else {
      balance = balance * (1 + rm);
      balance += thisMonthContribution;
      totalContributions += thisMonthContribution;
    }

    if (m % 12 === 0) {
      const y = m / 12;
      yearByYear.push({
        year: y,
        balance: round2(balance),
        contributions: round2(totalContributions),
        interest: round2(balance - principal - totalContributions),
      });
    }
  }

  return finish({
    principal, annualRatePercent, years,
    balance, totalContributions, yearByYear, inflation,
  });
}

function finish({ principal, annualRatePercent, years, balance, totalContributions, yearByYear, inflation }) {
  const finalBalance = round2(balance);
  const totalInterest = round2(balance - principal - totalContributions);
  const realBalance = inflation > 0
    ? round2(balance / Math.pow(1 + inflation, years))
    : finalBalance;
  return {
    principal,
    annualRatePercent,
    years,
    totalContributions: round2(totalContributions),
    totalDeposited: round2(principal + totalContributions),
    finalBalance,
    totalInterest,
    realBalance,
    yearByYear,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const exported = { calculateCompoundInterest, effectiveMonthlyRate };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.CompoundInterestCalc = exported;
}
