'use strict';

// Pure-logic Email Marketing ROI module. Currency handled in the UI layer.
//
// Funnel model:
//   list × sends → emails sent → opens (open rate) → clicks (click rate of sends)
//   → conversions (conversion rate of clicks) → revenue (conversions × value)
//
// ROI = (total net profit / total cost) × 100
// Break-even list size = monthly cost / revenue per subscriber per month
//   where revenue per sub = sendsPerMonth × clickRate × conversionRate × revenuePerConversion

function calculateEmailROI(opts) {
  const {
    listSize,
    sendsPerMonth,
    openRate,              // percentage, e.g. 22 means 22%
    clickRate,             // percentage of emails sent, e.g. 2.5 means 2.5%
    conversionRate,        // percentage of clicks, e.g. 2 means 2%
    revenuePerConversion,
    monthlyEspCost,
    monthlyContentCost = 0,
    periodMonths = 12,
  } = opts || {};

  if (!(listSize > 0))               throw new Error('listSize must be greater than 0');
  if (!(sendsPerMonth > 0))          throw new Error('sendsPerMonth must be greater than 0');
  if (!(openRate > 0))               throw new Error('openRate must be greater than 0');
  if (openRate > 100)                throw new Error('openRate cannot exceed 100');
  if (!(clickRate > 0))              throw new Error('clickRate must be greater than 0');
  if (clickRate > 100)               throw new Error('clickRate cannot exceed 100');
  if (!(conversionRate > 0))         throw new Error('conversionRate must be greater than 0');
  if (conversionRate > 100)          throw new Error('conversionRate cannot exceed 100');
  if (!(revenuePerConversion > 0))   throw new Error('revenuePerConversion must be greater than 0');
  if (!(monthlyEspCost >= 0))        throw new Error('monthlyEspCost must be >= 0');
  if (!(monthlyContentCost >= 0))    throw new Error('monthlyContentCost must be >= 0');
  if (!(periodMonths > 0))           throw new Error('periodMonths must be greater than 0');

  const monthlyEmailsSent   = round2(listSize * sendsPerMonth);
  const monthlyOpens        = round2(monthlyEmailsSent * (openRate / 100));
  const monthlyClicks       = round2(monthlyEmailsSent * (clickRate / 100));
  const monthlyConversions  = round2(monthlyClicks * (conversionRate / 100));
  const monthlyRevenue      = round2(monthlyConversions * revenuePerConversion);
  const monthlyCost         = round2(monthlyEspCost + monthlyContentCost);
  const monthlyNetProfit    = round2(monthlyRevenue - monthlyCost);

  const totalRevenue        = round2(monthlyRevenue * periodMonths);
  const totalCost           = round2(monthlyCost * periodMonths);
  const totalNetProfit      = round2(monthlyNetProfit * periodMonths);

  const roiPercent              = monthlyCost > 0 ? round2((totalNetProfit / totalCost) * 100) : null;
  const revenuePerUnitInvested  = monthlyCost > 0 ? round2(monthlyRevenue / monthlyCost) : null;
  const costPerConversion       = monthlyConversions > 0 ? round2(monthlyCost / monthlyConversions) : null;

  // Revenue generated per subscriber per month, used for break-even list size
  const revenuePerSubscriber = sendsPerMonth * (clickRate / 100) * (conversionRate / 100) * revenuePerConversion;
  const breakEvenListSize    = revenuePerSubscriber > 0 ? Math.ceil(monthlyCost / revenuePerSubscriber) : null;

  const isProfitable = monthlyNetProfit > 0;

  return {
    monthlyEmailsSent,
    monthlyOpens,
    monthlyClicks,
    monthlyConversions,
    monthlyRevenue,
    monthlyCost,
    monthlyNetProfit,
    totalRevenue,
    totalCost,
    totalNetProfit,
    roiPercent,
    revenuePerUnitInvested,
    costPerConversion,
    breakEvenListSize,
    isProfitable,
    periodMonths,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

const exported = { calculateEmailROI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.EmailROICalc = exported;
}
