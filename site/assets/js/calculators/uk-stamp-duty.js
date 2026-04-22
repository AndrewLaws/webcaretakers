'use strict';

// England and Northern Ireland SDLT rates from 1 April 2025.
// Scotland uses LBTT, Wales uses LTT — not covered here.

var TAX_YEAR = '2025/26';

// Standard residential bands: { from, to (exclusive upper), rate }
var STANDARD_BANDS = [
  { from: 0,        to: 125000,   rate: 0.00 },
  { from: 125000,   to: 250000,   rate: 0.02 },
  { from: 250000,   to: 925000,   rate: 0.05 },
  { from: 925000,   to: 1500000,  rate: 0.10 },
  { from: 1500000,  to: Infinity, rate: 0.12 },
];

// First-time buyer relief bands — applies only when price <= FTB_MAX_PRICE.
// Above FTB_MAX_PRICE the standard bands apply with no relief at all.
var FTB_MAX_PRICE = 500000;
var FTB_BANDS = [
  { from: 0,        to: 300000,   rate: 0.00 },
  { from: 300000,   to: 500000,   rate: 0.05 },
];

// Additional dwellings surcharge applied on top of each standard band.
var ADDITIONAL_SURCHARGE = 0.05;

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate tax due on one set of bands for a given price.
 * @param {number} price
 * @param {Array}  bands  - array of { from, to, rate }
 * @returns {Array} breakdown - array of { from, to, rate, taxableAmount, tax }
 */
function applyBands(price, bands) {
  var breakdown = [];
  for (var i = 0; i < bands.length; i++) {
    var b = bands[i];
    if (price <= b.from) break;
    var taxable = Math.min(price, b.to) - b.from;
    breakdown.push({
      from:          b.from,
      to:            Math.min(price, b.to),
      rate:          b.rate,
      taxableAmount: round2(taxable),
      tax:           round2(taxable * b.rate),
    });
  }
  return breakdown;
}

/**
 * Calculate UK Stamp Duty Land Tax (SDLT).
 * @param {object} opts
 * @param {number} opts.purchasePrice  - property purchase price (£)
 * @param {string} opts.buyerType      - 'standard' | 'first_time_buyer' | 'additional'
 */
function calculateSDLT({ purchasePrice, buyerType }) {
  if (typeof purchasePrice !== 'number' || purchasePrice <= 0) {
    throw new Error('purchasePrice must be a positive number');
  }
  if (buyerType !== 'standard' && buyerType !== 'first_time_buyer' && buyerType !== 'additional') {
    throw new Error('buyerType must be "standard", "first_time_buyer", or "additional"');
  }

  var bands, surcharge = 0, ftbRelief = false;

  if (buyerType === 'first_time_buyer' && purchasePrice <= FTB_MAX_PRICE) {
    bands = FTB_BANDS;
    ftbRelief = true;
  } else {
    bands = STANDARD_BANDS;
    if (buyerType === 'additional') {
      surcharge = ADDITIONAL_SURCHARGE;
    }
  }

  var breakdown = applyBands(purchasePrice, bands);

  // Add surcharge to each band for additional dwellings
  var surchargeAmount = 0;
  if (surcharge > 0) {
    breakdown = breakdown.map(function (b) {
      var extra = round2(b.taxableAmount * surcharge);
      surchargeAmount += extra;
      return Object.assign({}, b, {
        surcharge:   surcharge,
        surchargeAmount: extra,
        tax:         round2(b.tax + extra),
      });
    });
    surchargeAmount = round2(surchargeAmount);
  }

  var totalTax = round2(breakdown.reduce(function (s, b) { return s + b.tax; }, 0));
  var effectiveRate = purchasePrice > 0 ? round2((totalTax / purchasePrice) * 100) : 0;

  return {
    purchasePrice:    round2(purchasePrice),
    buyerType,
    ftbRelief,
    ftbEligible:      buyerType === 'first_time_buyer' && purchasePrice <= FTB_MAX_PRICE,
    ftbMaxPrice:      FTB_MAX_PRICE,
    surchargeRate:    surcharge,
    surchargeAmount,
    breakdown,
    totalTax,
    effectiveRate,
    taxYear:          TAX_YEAR,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateSDLT, TAX_YEAR, FTB_MAX_PRICE, STANDARD_BANDS, FTB_BANDS, ADDITIONAL_SURCHARGE };
} else {
  window.UKStampDuty = { calculateSDLT, TAX_YEAR, FTB_MAX_PRICE };
}
