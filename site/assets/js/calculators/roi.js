'use strict';

// Pure-logic ROI module. Country-neutral: the UI layer handles currency display.
//
// ROI (Return on Investment):
//   ROI % = (Final Value − Initial Investment) / Initial Investment × 100
//
// Annualised ROI (CAGR — Compound Annual Growth Rate):
//   CAGR = (Final Value / Initial Investment)^(1 / years) − 1
//   Only calculated when a period is provided.
//
// Break-even gain:
//   If currently at a loss, the % gain needed from the current value
//   to recover the original investment.
//   breakEvenGainPercent = (Initial Investment / Final Value − 1) × 100
//   Zero if already in profit.

function calculateROI(opts) {
  const {
    initialInvestment,
    finalValue,
    periodYears = 0,
    periodMonths = 0,
  } = opts || {};

  if (!(initialInvestment > 0)) throw new Error('initialInvestment must be greater than 0');
  if (!(finalValue >= 0)) throw new Error('finalValue must be >= 0');

  const netProfit = finalValue - initialInvestment;
  const roiPercent = round2((netProfit / initialInvestment) * 100);
  const multiple = round4(finalValue / initialInvestment);

  // Break-even: if underwater, how much % gain from current value to recover
  const breakEvenGainPercent = finalValue < initialInvestment
    ? round2((initialInvestment / finalValue - 1) * 100)
    : 0;

  // Annualised ROI only when a period is supplied
  const totalPeriodYears = periodYears + (periodMonths || 0) / 12;
  let annualisedROIPercent = null;
  if (totalPeriodYears > 0 && finalValue > 0) {
    const cagr = Math.pow(finalValue / initialInvestment, 1 / totalPeriodYears) - 1;
    annualisedROIPercent = round2(cagr * 100);
  }

  return {
    initialInvestment,
    finalValue,
    netProfit: round2(netProfit),
    roiPercent,
    multiple,
    annualisedROIPercent,
    totalPeriodYears: totalPeriodYears > 0 ? round4(totalPeriodYears) : null,
    breakEvenGainPercent,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

const exported = { calculateROI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.ROICalc = exported;
}
