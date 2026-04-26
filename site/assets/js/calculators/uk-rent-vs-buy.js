'use strict';

// UK Rent vs Buy calculator: pure-logic helpers.
//
// Compares the net cost of buying a home with a mortgage against the net
// cost of renting the equivalent property over a horizon in years.
//
// Buying side is modelled as:
//   cash out = deposit + upfront costs + total mortgage paid + total maintenance
//   cash in  = final house value - remaining loan balance - selling costs
//   net cost = cash out - cash in
//
// Renting side is modelled as:
//   cash out = total rent paid + total insurance paid
//   offset  = investment gain on the cash that would have gone into buying
//            (deposit + upfront) compounded at the chosen investment return.
//   If "invest the monthly difference" is on, any month where buying costs
//   more than renting, the saving is added to the investment pot (annual
//   contributions, compounded yearly with mid-year approximation).
//   net cost = cash out - investment gain
//
// SDLT uses the 2025/26 England & Northern Ireland bands (same source as
// the site's UK Stamp Duty Calculator).

var STANDARD_BANDS = [
  { from: 0,       to: 125000,   rate: 0.00 },
  { from: 125000,  to: 250000,   rate: 0.02 },
  { from: 250000,  to: 925000,   rate: 0.05 },
  { from: 925000,  to: 1500000,  rate: 0.10 },
  { from: 1500000, to: Infinity, rate: 0.12 },
];
var FTB_MAX_PRICE = 500000;
var FTB_BANDS = [
  { from: 0,       to: 300000,   rate: 0.00 },
  { from: 300000,  to: 500000,   rate: 0.05 },
];

function round2(n) { return Math.round(n * 100) / 100; }

function calculateSDLT(price, firstTimeBuyer) {
  if (!(price > 0)) return 0;
  var bands = (firstTimeBuyer && price <= FTB_MAX_PRICE) ? FTB_BANDS : STANDARD_BANDS;
  var tax = 0;
  for (var i = 0; i < bands.length; i++) {
    var b = bands[i];
    if (price <= b.from) break;
    var taxable = Math.min(price, b.to) - b.from;
    tax += taxable * b.rate;
  }
  return round2(tax);
}

function monthlyMortgage(principal, aprPercent, termYears) {
  var n = termYears * 12;
  var r = aprPercent / 100 / 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  var g = Math.pow(1 + r, n);
  return (principal * r * g) / (g - 1);
}

// Remaining loan balance after k monthly payments.
function balanceAfter(principal, aprPercent, termYears, paymentsMade) {
  if (principal <= 0) return 0;
  if (paymentsMade <= 0) return principal;
  var n = termYears * 12;
  if (paymentsMade >= n) return 0;
  var r = aprPercent / 100 / 12;
  var M = monthlyMortgage(principal, aprPercent, termYears);
  if (r === 0) return Math.max(0, principal - M * paymentsMade);
  var g = Math.pow(1 + r, paymentsMade);
  return Math.max(0, principal * g - M * ((g - 1) / r));
}

/**
 * Calculate rent vs buy over a horizon.
 *
 * @param {object} o
 * @param {number} o.housePrice
 * @param {number} o.deposit                 - cash deposit (£)
 * @param {number} o.mortgageTermYears
 * @param {number} o.mortgageRatePercent
 * @param {boolean} o.firstTimeBuyer
 * @param {number} o.buyingCostsExtra        - solicitor + survey + arrangement + misc (ex-SDLT)
 * @param {number} o.maintenancePercent      - % of house value per year
 * @param {number} o.housePriceGrowthPercent
 * @param {number} o.sellingCostPercent      - % of final house value (estate agent)
 * @param {number} o.sellingLegalFixed       - legal fee on sale (£)
 * @param {number} o.monthlyRent
 * @param {number} o.rentIncreasePercent
 * @param {number} o.rentersInsuranceMonthly
 * @param {number} o.investmentReturnPercent
 * @param {number} o.horizonYears
 * @param {boolean} o.investDifference       - invest positive monthly saving when renting cheaper
 */
function calculate(o) {
  var horizon = Math.max(1, Math.floor(o.horizonYears || 10));
  var principal = Math.max(0, (o.housePrice || 0) - (o.deposit || 0));
  var sdlt = calculateSDLT(o.housePrice || 0, !!o.firstTimeBuyer);
  var upfront = sdlt + (o.buyingCostsExtra || 0);
  var monthlyM = monthlyMortgage(principal, o.mortgageRatePercent || 0, o.mortgageTermYears || 25);

  var houseValue = o.housePrice || 0;
  var rentPerMonth = o.monthlyRent || 0;
  var insurancePerMonth = o.rentersInsuranceMonthly || 0;

  // Running totals
  var buyCashOut = (o.deposit || 0) + upfront;
  var rentCashOut = 0;
  var totalInterest = 0;
  var totalMortgagePaid = 0;
  var totalMaintenance = 0;
  var totalRent = 0;
  var totalInsurance = 0;

  var initialInvest = (o.deposit || 0) + upfront;
  var portfolio = initialInvest;
  var contribTotal = 0;

  var i = (o.investmentReturnPercent || 0) / 100;
  var g = (o.housePriceGrowthPercent || 0) / 100;
  var rentG = (o.rentIncreasePercent || 0) / 100;
  var maintPct = (o.maintenancePercent || 0) / 100;

  var rows = [];
  var breakEvenYear = null;

  for (var y = 1; y <= horizon; y++) {
    // Buyer annual outgoings this year
    var annualMortgage = monthlyM * 12;
    // Maintenance charged on value at start of year
    var annualMaintenance = houseValue * maintPct;
    var annualRent = rentPerMonth * 12;
    var annualInsurance = insurancePerMonth * 12;

    buyCashOut += annualMortgage + annualMaintenance;
    totalMortgagePaid += annualMortgage;
    totalMaintenance += annualMaintenance;

    rentCashOut += annualRent + annualInsurance;
    totalRent += annualRent;
    totalInsurance += annualInsurance;

    // Investment pot: grow existing, then optionally add monthly-difference
    // contribution approximated as annual with half-year compounding.
    var annualBuyCost = annualMortgage + annualMaintenance;
    var annualRentCost = annualRent + annualInsurance;
    portfolio = portfolio * (1 + i);
    if (o.investDifference) {
      var diff = annualBuyCost - annualRentCost;
      if (diff > 0) {
        portfolio += diff * (1 + i / 2);
        contribTotal += diff;
      }
    }

    // House value grows for next year
    houseValue = houseValue * (1 + g);
    // Rent grows for next year
    rentPerMonth = rentPerMonth * (1 + rentG);

    // Cumulative net cost at end of year y (if sold/exited today)
    var remainBal = balanceAfter(principal, o.mortgageRatePercent || 0, o.mortgageTermYears || 25, y * 12);
    var saleCosts = houseValue * ((o.sellingCostPercent || 0) / 100) + (o.sellingLegalFixed || 0);
    var buyNetY = buyCashOut - (houseValue - remainBal - saleCosts);
    var rentNetY = rentCashOut - (portfolio - initialInvest - contribTotal);

    rows.push({
      year: y,
      buyNet: round2(buyNetY),
      rentNet: round2(rentNetY),
      houseValue: round2(houseValue),
      remainingBalance: round2(remainBal),
      portfolio: round2(portfolio),
    });

    if (breakEvenYear === null && buyNetY < rentNetY) {
      breakEvenYear = y;
    }
  }

  var last = rows[rows.length - 1];
  return {
    horizonYears: horizon,
    sdlt: round2(sdlt),
    upfrontCosts: round2(upfront),
    buyingCostsExtra: round2(o.buyingCostsExtra || 0),
    monthlyMortgage: round2(monthlyM),
    finalHouseValue: last.houseValue,
    remainingBalance: last.remainingBalance,
    totalMortgagePaid: round2(totalMortgagePaid),
    totalMaintenance: round2(totalMaintenance),
    totalRent: round2(totalRent),
    totalInsurance: round2(totalInsurance),
    netBuyingCost: last.buyNet,
    netRentingCost: last.rentNet,
    difference: round2(last.buyNet - last.rentNet), // positive = buying costs more
    verdict: last.buyNet < last.rentNet ? 'buy' : 'rent',
    savings: round2(Math.abs(last.buyNet - last.rentNet)),
    breakEvenYear: breakEvenYear,
    finalPortfolio: last.portfolio,
    rows: rows,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculate, calculateSDLT, monthlyMortgage, balanceAfter };
} else {
  window.UKRentVsBuy = { calculate: calculate, calculateSDLT: calculateSDLT };
}
