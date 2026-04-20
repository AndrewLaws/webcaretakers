'use strict';

// Pure-logic SEO ROI module. Country-neutral: currency is handled in the UI layer.
//
// The calculation models a traffic funnel:
//   organic sessions → conversions (sessions × rate) → revenue (conversions × value)
//
// ROI is measured on the *additional* revenue attributable to the SEO investment:
//   additional revenue = (projectedSessions − currentSessions) × conversionRate × valuePerConversion
//   monthly net profit = additionalRevenue − monthlyCost
//   ROI % = (totalNetProfit / totalInvestment) × 100
//
// Break-even sessions = monthlyCost / (conversionRate × valuePerConversion)
//   This tells the user the minimum additional monthly sessions needed to cover the cost.

function calculateSEOROI(opts) {
  const {
    monthlyCost,
    currentSessions,
    projectedSessions,
    conversionRate,         // percentage, e.g. 2 means 2%
    valuePerConversion,
    periodMonths = 12,
  } = opts || {};

  if (!(monthlyCost > 0))      throw new Error('monthlyCost must be greater than 0');
  if (!(currentSessions >= 0)) throw new Error('currentSessions must be >= 0');
  if (!(projectedSessions >= 0)) throw new Error('projectedSessions must be >= 0');
  if (!(conversionRate > 0))   throw new Error('conversionRate must be greater than 0');
  if (conversionRate > 100)    throw new Error('conversionRate cannot exceed 100');
  if (!(valuePerConversion > 0)) throw new Error('valuePerConversion must be greater than 0');
  if (!(periodMonths > 0))     throw new Error('periodMonths must be greater than 0');

  const rate = conversionRate / 100;

  const additionalSessions           = projectedSessions - currentSessions;
  const currentMonthlyConversions    = round2(currentSessions * rate);
  const projectedMonthlyConversions  = round2(projectedSessions * rate);
  const additionalMonthlyConversions = round2(additionalSessions * rate);

  const currentMonthlyRevenue        = round2(currentMonthlyConversions * valuePerConversion);
  const projectedMonthlyRevenue      = round2(projectedMonthlyConversions * valuePerConversion);
  const additionalMonthlyRevenue     = round2(additionalMonthlyConversions * valuePerConversion);

  const monthlyNetProfit             = round2(additionalMonthlyRevenue - monthlyCost);

  const totalInvestment              = round2(monthlyCost * periodMonths);
  const totalAdditionalRevenue       = round2(additionalMonthlyRevenue * periodMonths);
  const totalNetProfit               = round2(monthlyNetProfit * periodMonths);

  const roiPercent                   = round2((totalNetProfit / totalInvestment) * 100);

  // Revenue per unit invested: how many £/$ of additional revenue per £/$ spent
  const revenuePerUnitInvested       = round2(additionalMonthlyRevenue / monthlyCost);

  // Minimum sessions needed to cover the monthly cost
  const breakEvenSessionsPerMonth    = Math.ceil(monthlyCost / (rate * valuePerConversion));

  const isProfitable                 = monthlyNetProfit > 0;

  return {
    monthlyCost,
    periodMonths,
    additionalSessions,
    currentMonthlyConversions,
    projectedMonthlyConversions,
    additionalMonthlyConversions,
    currentMonthlyRevenue,
    projectedMonthlyRevenue,
    additionalMonthlyRevenue,
    monthlyNetProfit,
    totalInvestment,
    totalAdditionalRevenue,
    totalNetProfit,
    roiPercent,
    revenuePerUnitInvested,
    breakEvenSessionsPerMonth,
    isProfitable,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

const exported = { calculateSEOROI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.SEOROICalc = exported;
}
