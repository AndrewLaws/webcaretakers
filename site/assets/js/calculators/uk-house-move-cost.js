'use strict';

// UK House Move Cost calculator: pure-logic helpers.
//
// Estimates the total cost of moving home in the UK by summing the
// constituent costs. All figures are GBP. Most fees are quoted as a
// realistic low-mid-high range so the returned breakdown carries a
// best-case and worst-case spread. Stamp duty (or LBTT/LTT) is computed
// exactly from the appropriate band table for England & NI, Scotland,
// or Wales.
//
// Data is current for the 2025/26 tax year, after the SDLT threshold
// reset of 1 April 2025. The additional-property surcharge in England
// and NI is 5% (raised from 3% in late 2024). LBTT additional dwelling
// supplement is 8%. LTT higher-residential rates add 5% on top of the
// main residential bands.

// ---------- Stamp duty bands ----------

// England & Northern Ireland (SDLT)
var SDLT_STANDARD = [
  { from: 0,        to: 125000,   rate: 0.00 },
  { from: 125000,   to: 250000,   rate: 0.02 },
  { from: 250000,   to: 925000,   rate: 0.05 },
  { from: 925000,   to: 1500000,  rate: 0.10 },
  { from: 1500000,  to: Infinity, rate: 0.12 },
];
var SDLT_FTB_MAX = 500000;
var SDLT_FTB = [
  { from: 0,        to: 300000,   rate: 0.00 },
  { from: 300000,   to: 500000,   rate: 0.05 },
];
var SDLT_ADDITIONAL_SURCHARGE = 0.05;

// Scotland (LBTT)
var LBTT_STANDARD = [
  { from: 0,       to: 145000,   rate: 0.00 },
  { from: 145000,  to: 250000,   rate: 0.02 },
  { from: 250000,  to: 325000,   rate: 0.05 },
  { from: 325000,  to: 750000,   rate: 0.10 },
  { from: 750000,  to: Infinity, rate: 0.12 },
];
// FTB relief: nil-rate up to £175,000 then standard bands above.
var LBTT_FTB = [
  { from: 0,       to: 175000,   rate: 0.00 },
  { from: 175000,  to: 250000,   rate: 0.02 },
  { from: 250000,  to: 325000,   rate: 0.05 },
  { from: 325000,  to: 750000,   rate: 0.10 },
  { from: 750000,  to: Infinity, rate: 0.12 },
];
var LBTT_ADS_SURCHARGE = 0.08; // Additional Dwelling Supplement

// Wales (LTT). No FTB relief in Wales.
var LTT_STANDARD = [
  { from: 0,       to: 225000,   rate: 0.00 },
  { from: 225000,  to: 400000,   rate: 0.06 },
  { from: 400000,  to: 750000,   rate: 0.075 },
  { from: 750000,  to: 1500000,  rate: 0.10 },
  { from: 1500000, to: Infinity, rate: 0.12 },
];
var LTT_HIGHER_SURCHARGE = 0.05;

// ---------- Other fee tables ----------

var CONVEYANCING_BUY  = { low: 850, mid: 1175, high: 1500 };
var CONVEYANCING_SELL = { low: 750, mid: 1025, high: 1300 };
var EPC_RANGE         = { low: 60,  mid: 90,   high: 120 };
var CONTINGENCY       = 250;

// Survey costs by level. Level 0 (none) is the toggle.
var SURVEY_COSTS = {
  none:   { low: 0,    mid: 0,    high: 0 },
  level1: { low: 300,  mid: 400,  high: 500 },
  level2: { low: 400,  mid: 650,  high: 900 },
  level3: { low: 600,  mid: 1050, high: 1500 },
};

// Mortgage arrangement (often called product or booking fee).
// Range £0–£2,000 with a sensible mid of £1,000.
function mortgageArrangement(mortgage) {
  if (!(mortgage > 0)) return { low: 0, mid: 0, high: 0 };
  return { low: 0, mid: 1000, high: 2000 };
}

// Lender valuation fee, scales loosely with property price. Some
// lenders bundle it free into a product, others charge by tier.
function valuationFee(propertyPrice, mortgage) {
  if (!(mortgage > 0)) return { low: 0, mid: 0, high: 0 };
  if (propertyPrice < 250000)  return { low: 150, mid: 300,  high: 500 };
  if (propertyPrice < 500000)  return { low: 200, mid: 400,  high: 700 };
  if (propertyPrice < 1000000) return { low: 300, mid: 600,  high: 1000 };
  return                              { low: 500, mid: 900,  high: 1500 };
}

// Removals matrix: house size × distance.
var REMOVALS = {
  '2-bed': {
    short:  { low: 400,  mid: 600,  high: 900 },
    medium: { low: 600,  mid: 900,  high: 1300 },
    long:   { low: 900,  mid: 1300, high: 1800 },
  },
  '3-bed': {
    short:  { low: 600,  mid: 900,  high: 1300 },
    medium: { low: 900,  mid: 1300, high: 1800 },
    long:   { low: 1300, mid: 1800, high: 2500 },
  },
  '4-bed': {
    short:  { low: 900,  mid: 1300, high: 1800 },
    medium: { low: 1300, mid: 1900, high: 2700 },
    long:   { low: 1900, mid: 2700, high: 3800 },
  },
};

// ---------- Helpers ----------

function round2(n) {
  return Math.round(n * 100) / 100;
}
function roundCurrency(n) {
  return Math.round(n);
}

function applyBands(price, bands) {
  var breakdown = [];
  for (var i = 0; i < bands.length; i++) {
    var b = bands[i];
    if (price <= b.from) break;
    var taxable = Math.min(price, b.to) - b.from;
    breakdown.push({
      from: b.from,
      to: Math.min(price, b.to),
      rate: b.rate,
      taxableAmount: round2(taxable),
      tax: round2(taxable * b.rate),
    });
  }
  return breakdown;
}

// ---------- Stamp duty (band-by-band) ----------

function calculateStampDuty(opts) {
  var price = opts.propertyPrice;
  var country = opts.country; // 'england_ni' | 'scotland' | 'wales'
  var buyerStatus = opts.buyerStatus; // 'first_time' | 'home_mover' | 'additional'

  if (!(price > 0)) {
    throw new Error('propertyPrice must be a positive number');
  }
  if (country !== 'england_ni' && country !== 'scotland' && country !== 'wales') {
    throw new Error('country must be one of: england_ni, scotland, wales');
  }
  if (buyerStatus !== 'first_time' && buyerStatus !== 'home_mover' && buyerStatus !== 'additional') {
    throw new Error('buyerStatus must be one of: first_time, home_mover, additional');
  }

  var bands;
  var taxName;
  var surcharge = 0;
  var ftbApplied = false;

  if (country === 'england_ni') {
    taxName = 'SDLT';
    if (buyerStatus === 'first_time' && price <= SDLT_FTB_MAX) {
      bands = SDLT_FTB;
      ftbApplied = true;
    } else {
      bands = SDLT_STANDARD;
      if (buyerStatus === 'additional') surcharge = SDLT_ADDITIONAL_SURCHARGE;
    }
  } else if (country === 'scotland') {
    taxName = 'LBTT';
    if (buyerStatus === 'first_time') {
      bands = LBTT_FTB;
      ftbApplied = true;
    } else {
      bands = LBTT_STANDARD;
      if (buyerStatus === 'additional') surcharge = LBTT_ADS_SURCHARGE;
    }
  } else {
    taxName = 'LTT';
    // Wales has no FTB relief.
    bands = LTT_STANDARD;
    if (buyerStatus === 'additional') surcharge = LTT_HIGHER_SURCHARGE;
  }

  var breakdown = applyBands(price, bands);
  var surchargeAmount = 0;
  if (surcharge > 0) {
    breakdown = breakdown.map(function (b) {
      var extra = round2(b.taxableAmount * surcharge);
      surchargeAmount += extra;
      return {
        from: b.from,
        to: b.to,
        rate: b.rate,
        taxableAmount: b.taxableAmount,
        bandTax: b.tax,
        surcharge: surcharge,
        surchargeAmount: extra,
        tax: round2(b.tax + extra),
      };
    });
    surchargeAmount = round2(surchargeAmount);
  }

  var total = round2(breakdown.reduce(function (s, b) { return s + b.tax; }, 0));
  return {
    taxName: taxName,
    country: country,
    buyerStatus: buyerStatus,
    ftbApplied: ftbApplied,
    surcharge: surcharge,
    surchargeAmount: surchargeAmount,
    breakdown: breakdown,
    total: total,
  };
}

// ---------- Whole move cost ----------

function calculateMoveCost(args) {
  var propertyPrice  = args.propertyPrice;
  var country        = args.country;
  var buyerStatus    = args.buyerStatus;
  var mortgage       = args.mortgage || 0;
  var surveyType     = args.surveyType || 'none';
  var houseSize      = args.houseSize || '3-bed';
  var distance       = args.distance || 'short';
  var selling        = !!args.selling;
  var agentFeePct    = typeof args.agentFeePct === 'number' ? args.agentFeePct : 1.2;
  var salePrice      = args.salePrice || propertyPrice; // assume similar sale price if not given

  if (!(propertyPrice > 0)) {
    throw new Error('propertyPrice must be a positive number');
  }
  if (mortgage < 0) {
    throw new Error('mortgage must be zero or positive');
  }
  if (!SURVEY_COSTS[surveyType]) {
    throw new Error('surveyType must be one of: none, level1, level2, level3');
  }
  if (!REMOVALS[houseSize]) {
    throw new Error('houseSize must be one of: 2-bed, 3-bed, 4-bed');
  }
  if (!REMOVALS[houseSize][distance]) {
    throw new Error('distance must be one of: short, medium, long');
  }

  var stampDuty = calculateStampDuty({
    propertyPrice: propertyPrice,
    country: country,
    buyerStatus: buyerStatus,
  });

  // Each line item carries low/mid/high. Stamp duty is exact, so all
  // three values are equal.
  var items = [];

  items.push({
    key: 'stamp_duty',
    label: stampDuty.taxName + (stampDuty.ftbApplied ? ' (first-time buyer relief)' : (stampDuty.surcharge > 0 ? ' (incl. additional-property surcharge)' : '')),
    low: stampDuty.total,
    mid: stampDuty.total,
    high: stampDuty.total,
    detail: stampDuty,
  });

  items.push({
    key: 'conveyancing_buy',
    label: 'Conveyancing (buying)',
    low: CONVEYANCING_BUY.low,
    mid: CONVEYANCING_BUY.mid,
    high: CONVEYANCING_BUY.high,
  });

  if (selling) {
    items.push({
      key: 'conveyancing_sell',
      label: 'Conveyancing (selling)',
      low: CONVEYANCING_SELL.low,
      mid: CONVEYANCING_SELL.mid,
      high: CONVEYANCING_SELL.high,
    });
  }

  if (mortgage > 0) {
    var arrangement = mortgageArrangement(mortgage);
    var valuation   = valuationFee(propertyPrice, mortgage);
    items.push({
      key: 'mortgage_arrangement',
      label: 'Mortgage arrangement fee',
      low: arrangement.low, mid: arrangement.mid, high: arrangement.high,
    });
    items.push({
      key: 'mortgage_valuation',
      label: 'Lender valuation fee',
      low: valuation.low, mid: valuation.mid, high: valuation.high,
    });
  }

  var survey = SURVEY_COSTS[surveyType];
  if (surveyType !== 'none') {
    items.push({
      key: 'survey',
      label: 'Survey (' + surveyLabel(surveyType) + ')',
      low: survey.low, mid: survey.mid, high: survey.high,
    });
  }

  var removals = REMOVALS[houseSize][distance];
  items.push({
    key: 'removals',
    label: 'Removals (' + houseSize + ', ' + distance + ' distance)',
    low: removals.low, mid: removals.mid, high: removals.high,
  });

  if (selling) {
    var agentFee = round2(salePrice * (agentFeePct / 100));
    items.push({
      key: 'estate_agent',
      label: 'Estate agent (' + agentFeePct + '% of £' + Math.round(salePrice).toLocaleString('en-GB') + ')',
      low: agentFee, mid: agentFee, high: agentFee,
    });
    items.push({
      key: 'epc',
      label: 'EPC (energy performance certificate)',
      low: EPC_RANGE.low, mid: EPC_RANGE.mid, high: EPC_RANGE.high,
    });
  }

  items.push({
    key: 'contingency',
    label: 'Contingency / miscellaneous',
    low: CONTINGENCY, mid: CONTINGENCY, high: CONTINGENCY,
  });

  var totals = items.reduce(function (acc, it) {
    acc.low += it.low; acc.mid += it.mid; acc.high += it.high;
    return acc;
  }, { low: 0, mid: 0, high: 0 });

  return {
    inputs: {
      propertyPrice: propertyPrice,
      country: country,
      buyerStatus: buyerStatus,
      mortgage: mortgage,
      surveyType: surveyType,
      houseSize: houseSize,
      distance: distance,
      selling: selling,
      agentFeePct: agentFeePct,
      salePrice: salePrice,
    },
    stampDuty: stampDuty,
    items: items,
    totals: {
      low: round2(totals.low),
      mid: round2(totals.mid),
      high: round2(totals.high),
    },
  };
}

function surveyLabel(t) {
  if (t === 'level1') return 'Level 1 condition report';
  if (t === 'level2') return 'Level 2 homebuyer report';
  if (t === 'level3') return 'Level 3 building survey';
  return 'none';
}

var exported = {
  calculateMoveCost: calculateMoveCost,
  calculateStampDuty: calculateStampDuty,
  surveyLabel: surveyLabel,
  SDLT_STANDARD: SDLT_STANDARD,
  SDLT_FTB: SDLT_FTB,
  SDLT_FTB_MAX: SDLT_FTB_MAX,
  SDLT_ADDITIONAL_SURCHARGE: SDLT_ADDITIONAL_SURCHARGE,
  LBTT_STANDARD: LBTT_STANDARD,
  LBTT_FTB: LBTT_FTB,
  LBTT_ADS_SURCHARGE: LBTT_ADS_SURCHARGE,
  LTT_STANDARD: LTT_STANDARD,
  LTT_HIGHER_SURCHARGE: LTT_HIGHER_SURCHARGE,
  CONVEYANCING_BUY: CONVEYANCING_BUY,
  CONVEYANCING_SELL: CONVEYANCING_SELL,
  EPC_RANGE: EPC_RANGE,
  CONTINGENCY: CONTINGENCY,
  SURVEY_COSTS: SURVEY_COSTS,
  REMOVALS: REMOVALS,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.UkHouseMoveCost = exported;
}
