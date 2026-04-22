'use strict';

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate gross and net profit margins from revenue and costs.
 * @param {object} opts
 * @param {number} opts.revenue            - Total revenue / selling price
 * @param {number} opts.cogs               - Cost of goods sold (direct costs)
 * @param {number} [opts.operatingExpenses] - Additional operating costs (optional)
 */
function calculateMargin({ revenue, cogs, operatingExpenses }) {
  if (typeof revenue !== 'number' || revenue <= 0) throw new Error('revenue must be a positive number');
  if (typeof cogs !== 'number' || cogs < 0)        throw new Error('cogs must be a non-negative number');

  var opEx = (typeof operatingExpenses === 'number' && operatingExpenses >= 0) ? operatingExpenses : 0;

  var grossProfit    = round2(revenue - cogs);
  var grossMarginPct = round2((grossProfit / revenue) * 100);
  var markupPct      = cogs > 0 ? round2((grossProfit / cogs) * 100) : null;

  var netProfit    = round2(grossProfit - opEx);
  var netMarginPct = round2((netProfit / revenue) * 100);

  return {
    revenue:            round2(revenue),
    cogs:               round2(cogs),
    operatingExpenses:  round2(opEx),
    grossProfit,
    grossMarginPct,
    markupPct,
    netProfit,
    netMarginPct,
    hasOperatingExpenses: opEx > 0,
  };
}

/**
 * Reverse calculation: given cost and a target margin %, find the selling price.
 * margin % = (price - cost) / price × 100  →  price = cost / (1 - margin/100)
 */
function calculatePriceFromMargin({ cost, targetMarginPct }) {
  if (typeof cost !== 'number' || cost <= 0) throw new Error('cost must be a positive number');
  if (typeof targetMarginPct !== 'number' || targetMarginPct <= 0 || targetMarginPct >= 100) {
    throw new Error('targetMarginPct must be between 0 and 100 (exclusive)');
  }

  var price     = round2(cost / (1 - targetMarginPct / 100));
  var profit    = round2(price - cost);
  var markupPct = round2((profit / cost) * 100);

  return { cost: round2(cost), price, profit, targetMarginPct, markupPct };
}

/**
 * Reverse calculation: given cost and a target markup %, find the selling price.
 * markup % = (price - cost) / cost × 100  →  price = cost × (1 + markup/100)
 */
function calculatePriceFromMarkup({ cost, targetMarkupPct }) {
  if (typeof cost !== 'number' || cost <= 0) throw new Error('cost must be a positive number');
  if (typeof targetMarkupPct !== 'number' || targetMarkupPct <= 0) {
    throw new Error('targetMarkupPct must be a positive number');
  }

  var price      = round2(cost * (1 + targetMarkupPct / 100));
  var profit     = round2(price - cost);
  var marginPct  = round2((profit / price) * 100);

  return { cost: round2(cost), price, profit, targetMarkupPct, marginPct };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateMargin, calculatePriceFromMargin, calculatePriceFromMarkup };
} else {
  window.ProfitMargin = { calculateMargin, calculatePriceFromMargin, calculatePriceFromMarkup };
}
