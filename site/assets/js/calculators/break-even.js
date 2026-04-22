'use strict';

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate the break-even point for a business or product.
 *
 * Break-even units = fixedCosts / contributionMarginPerUnit
 * Contribution margin per unit = sellingPrice - variableCostPerUnit
 *
 * @param {object} opts
 * @param {number} opts.fixedCosts             - Total fixed costs per period (£)
 * @param {number} opts.variableCostPerUnit     - Variable cost per unit sold (£)
 * @param {number} opts.sellingPricePerUnit     - Selling price per unit (£)
 * @param {number} [opts.targetProfit]          - Optional profit target for the period (£)
 */
function calculateBreakEven(opts) {
  var fixedCosts    = opts.fixedCosts;
  var varCost       = opts.variableCostPerUnit;
  var price         = opts.sellingPricePerUnit;
  var targetProfit  = (typeof opts.targetProfit === 'number' && opts.targetProfit >= 0)
                        ? opts.targetProfit : null;

  if (typeof fixedCosts !== 'number' || fixedCosts < 0) throw new Error('fixedCosts must be a non-negative number');
  if (typeof varCost    !== 'number' || varCost < 0)    throw new Error('variableCostPerUnit must be a non-negative number');
  if (typeof price      !== 'number' || price <= 0)     throw new Error('sellingPricePerUnit must be a positive number');
  if (price <= varCost) throw new Error('sellingPricePerUnit must exceed variableCostPerUnit');

  var contributionMargin    = round2(price - varCost);
  var contributionMarginPct = round2((contributionMargin / price) * 100);

  // Ceiling: you need to sell whole units, so round up
  var breakEvenUnits   = Math.ceil(fixedCosts / contributionMargin);
  var breakEvenRevenue = round2(breakEvenUnits * price);

  var targetUnits   = null;
  var targetRevenue = null;
  if (targetProfit !== null) {
    targetUnits   = Math.ceil((fixedCosts + targetProfit) / contributionMargin);
    targetRevenue = round2(targetUnits * price);
  }

  // Scenario table: 50%, 75%, 100%, 125%, 150% of break-even volume
  var scenarios = [0.5, 0.75, 1.0, 1.25, 1.5].map(function (factor) {
    var units        = Math.round(breakEvenUnits * factor);
    var revenue      = round2(units * price);
    var varCosts     = round2(units * varCost);
    var profit       = round2(revenue - varCosts - fixedCosts);
    return { factor: factor, units: units, revenue: revenue, variableCosts: varCosts, profit: profit };
  });

  return {
    fixedCosts:            round2(fixedCosts),
    variableCostPerUnit:   round2(varCost),
    sellingPricePerUnit:   round2(price),
    contributionMargin,
    contributionMarginPct,
    breakEvenUnits,
    breakEvenRevenue,
    targetUnits,
    targetRevenue,
    scenarios,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateBreakEven };
} else {
  window.BreakEven = { calculateBreakEven };
}
