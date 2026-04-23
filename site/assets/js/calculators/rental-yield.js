'use strict';

// Rental yield calculator.
//
// Gross yield: annual rent as a percentage of property value.
// Net yield: (annual rent - annual running costs) as a percentage of
//   property value. Running costs do NOT include mortgage payments --
//   yield is a property-level return, independent of how the deal is
//   financed.
//
// Optional cash-on-cash layer: if a deposit (the cash actually put into
// the deal) and a monthly mortgage payment are supplied, we also compute
// annual cash flow and return on cash invested.

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * @param {object} opts
 * @param {number} opts.propertyValue           - market value / purchase price
 * @param {number} opts.monthlyRent             - rent received per calendar month
 * @param {number} [opts.annualCosts=0]         - all non-mortgage annual costs
 * @param {number} [opts.deposit]               - cash invested, to compute ROI
 * @param {number} [opts.monthlyMortgagePayment] - monthly mortgage (optional, with deposit)
 */
function calculateYield(opts) {
  var propertyValue           = opts.propertyValue;
  var monthlyRent             = opts.monthlyRent;
  var annualCosts             = opts.annualCosts == null ? 0 : opts.annualCosts;
  var deposit                 = opts.deposit;
  var monthlyMortgagePayment  = opts.monthlyMortgagePayment;

  if (typeof propertyValue !== 'number' || propertyValue <= 0) {
    throw new Error('propertyValue must be a positive number');
  }
  if (typeof monthlyRent !== 'number' || monthlyRent < 0) {
    throw new Error('monthlyRent must be zero or a positive number');
  }
  if (typeof annualCosts !== 'number' || annualCosts < 0) {
    throw new Error('annualCosts must be zero or a positive number');
  }

  var annualRent      = monthlyRent * 12;
  var netAnnualIncome = annualRent - annualCosts;
  var grossYield      = (annualRent / propertyValue) * 100;
  var netYield        = (netAnnualIncome / propertyValue) * 100;

  var result = {
    propertyValue:   round2(propertyValue),
    monthlyRent:     round2(monthlyRent),
    annualRent:      round2(annualRent),
    annualCosts:     round2(annualCosts),
    netAnnualIncome: round2(netAnnualIncome),
    grossYield:      round2(grossYield),
    netYield:        round2(netYield),
  };

  if (typeof deposit === 'number' && deposit > 0) {
    var annualMortgage  = (typeof monthlyMortgagePayment === 'number' && monthlyMortgagePayment > 0)
                            ? monthlyMortgagePayment * 12
                            : 0;
    var annualCashFlow  = netAnnualIncome - annualMortgage;
    var monthlyCashFlow = annualCashFlow / 12;
    var roiOnDeposit    = (annualCashFlow / deposit) * 100;

    result.deposit                = round2(deposit);
    result.monthlyMortgagePayment = round2(monthlyMortgagePayment || 0);
    result.annualMortgage         = round2(annualMortgage);
    result.annualCashFlow         = round2(annualCashFlow);
    result.monthlyCashFlow        = round2(monthlyCashFlow);
    result.roiOnDeposit           = round2(roiOnDeposit);
  }

  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateYield };
} else {
  window.RentalYield = { calculateYield: calculateYield };
}
