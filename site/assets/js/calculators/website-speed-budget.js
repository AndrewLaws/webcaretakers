'use strict';

// Page-weight budgets (KB, approximate transfer sizes) and Core Web Vitals targets
// for common site types and connection scenarios.

var SITE_TYPES = {
  ecommerce: 'E-commerce store',
  blog:      'Blog or content site',
  saas:      'SaaS or web app',
  portfolio: 'Portfolio or brochure site'
};

var CONNECTION_TARGETS = {
  mobile_fast: 'Fast mobile (4G)',
  mobile_slow: 'Slower mobile (3G)',
  desktop:     'Desktop broadband'
};

// Budget breakdown by site type × connection target (all values in KB)
var BUDGETS = {
  ecommerce: {
    mobile_fast: { totalKb: 1500, jsKb: 300,  cssKb:  80, imagesKb:  900, fontsKb: 100, otherKb: 120 },
    mobile_slow: { totalKb:  500, jsKb: 100,  cssKb:  50, imagesKb:  280, fontsKb:  40, otherKb:  30 },
    desktop:     { totalKb: 3000, jsKb: 500,  cssKb: 150, imagesKb: 2000, fontsKb: 150, otherKb: 200 }
  },
  blog: {
    mobile_fast: { totalKb:  500, jsKb:  80,  cssKb:  50, imagesKb:  300, fontsKb:  40, otherKb:  30 },
    mobile_slow: { totalKb:  200, jsKb:  30,  cssKb:  25, imagesKb:  120, fontsKb:  15, otherKb:  10 },
    desktop:     { totalKb: 1500, jsKb: 150,  cssKb:  80, imagesKb: 1150, fontsKb:  80, otherKb:  40 }
  },
  saas: {
    mobile_fast: { totalKb: 1000, jsKb: 250,  cssKb: 100, imagesKb:  500, fontsKb:  80, otherKb:  70 },
    mobile_slow: { totalKb:  350, jsKb:  80,  cssKb:  50, imagesKb:  180, fontsKb:  25, otherKb:  15 },
    desktop:     { totalKb: 2000, jsKb: 400,  cssKb: 150, imagesKb: 1200, fontsKb: 100, otherKb: 150 }
  },
  portfolio: {
    mobile_fast: { totalKb:  600, jsKb:  80,  cssKb:  60, imagesKb:  400, fontsKb:  40, otherKb:  20 },
    mobile_slow: { totalKb:  250, jsKb:  40,  cssKb:  30, imagesKb:  150, fontsKb:  20, otherKb:  10 },
    desktop:     { totalKb: 2000, jsKb: 150,  cssKb:  80, imagesKb: 1650, fontsKb:  80, otherKb:  40 }
  }
};

// Aspirational targets — tighter than Google's "needs improvement" thresholds
var CWV_TARGETS = { lcp: 2.0, cls: 0.05, inp: 150 };
// Google's official "good" thresholds (for reference in UI)
var CWV_GOOD    = { lcp: 2.5, cls: 0.10, inp: 200 };

// Estimated conversion loss per extra second above 2-second baseline (fraction)
// Based on Google / Portent research; varies by site type
var CONVERSION_LOSS_PER_SECOND = {
  ecommerce: 0.07,
  saas:      0.05,
  blog:      0.02,
  portfolio: 0.02
};
var OPTIMAL_LOAD_TIME = 2; // seconds

function r0(n) { return Math.round(n); }

function calculateWebsiteSpeedBudget(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('opts is required');

  var siteType         = opts.siteType;
  var connectionTarget = opts.connectionTarget;

  if (!SITE_TYPES[siteType])           throw new Error('invalid siteType: '         + siteType);
  if (!CONNECTION_TARGETS[connectionTarget]) throw new Error('invalid connectionTarget: ' + connectionTarget);

  var budget = BUDGETS[siteType][connectionTarget];

  // Optional revenue-impact calculation
  var revenueImpact    = null;
  var monthlyVisitors  = opts.monthlyVisitors  != null ? Number(opts.monthlyVisitors)  : null;
  var currentLoadTime  = opts.currentLoadTime  != null ? Number(opts.currentLoadTime)  : null;
  var conversionRate   = opts.conversionRate   != null ? Number(opts.conversionRate)   : null; // %
  var avgOrderValue    = opts.avgOrderValue    != null ? Number(opts.avgOrderValue)    : null;

  if (
    monthlyVisitors !== null && isFinite(monthlyVisitors) && monthlyVisitors > 0 &&
    currentLoadTime !== null && isFinite(currentLoadTime) && currentLoadTime > OPTIMAL_LOAD_TIME &&
    conversionRate  !== null && isFinite(conversionRate)  && conversionRate  > 0 &&
    avgOrderValue   !== null && isFinite(avgOrderValue)   && avgOrderValue   > 0
  ) {
    var lossRate      = CONVERSION_LOSS_PER_SECOND[siteType];
    var extraSeconds  = currentLoadTime - OPTIMAL_LOAD_TIME;
    var totalLoss     = Math.min(extraSeconds * lossRate, 0.80); // cap at 80 %

    var currentConvRate  = conversionRate / 100;
    var currentRevenue   = monthlyVisitors * currentConvRate * avgOrderValue;

    // Optimal conv rate = current / (1 - estimatedLoss)
    var optimalConvRate  = currentConvRate / (1 - totalLoss);
    var optimalRevenue   = monthlyVisitors * optimalConvRate * avgOrderValue;

    var monthlyGap = r0(optimalRevenue - currentRevenue);

    revenueImpact = {
      currentMonthlyRevenue:  r0(currentRevenue),
      optimalMonthlyRevenue:  r0(optimalRevenue),
      monthlyRevenueGap:      monthlyGap,
      annualRevenueGap:       monthlyGap * 12,
      estimatedLossPercent:   Math.round(totalLoss * 100 * 10) / 10
    };
  }

  return {
    siteType:          siteType,
    siteTypeLabel:     SITE_TYPES[siteType],
    connectionTarget:  connectionTarget,
    connectionLabel:   CONNECTION_TARGETS[connectionTarget],
    budget:            budget,
    cwvTargets:        CWV_TARGETS,
    cwvGoodThresholds: CWV_GOOD,
    revenueImpact:     revenueImpact
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calculateWebsiteSpeedBudget, SITE_TYPES, CONNECTION_TARGETS, BUDGETS, CWV_TARGETS, CWV_GOOD };
}
if (typeof window !== 'undefined') {
  window.WebsiteSpeedBudget = { calculateWebsiteSpeedBudget, SITE_TYPES, CONNECTION_TARGETS };
}
