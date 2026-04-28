'use strict';

// England, Wales and Northern Ireland — tax year 2025/26.
// Scotland's bands differ; this calculator uses E/W/NI rates.
var TAX_YEAR = '2025/26';

var PERSONAL_ALLOWANCE   = 12570;
var BASIC_RATE_UPPER     = 50270;
var HIGHER_RATE_UPPER    = 125140;
var PA_TAPER_THRESHOLD   = 100000;

// Corporation tax 2025/26
var CT_SMALL_PROFITS_LIMIT = 50000;
var CT_UPPER_LIMIT         = 250000;
var CT_SMALL_RATE          = 0.19;
var CT_MAIN_RATE           = 0.25;
// Marginal relief fraction (HMRC standard fraction for 2025/26): 3/200
var CT_MARGINAL_FRACTION   = 3 / 200;

function r2(n) { return Math.round(n * 100) / 100; }

function effectivePersonalAllowance(income) {
  if (income <= PA_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  var reduction = Math.floor((income - PA_TAPER_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

function calcIncomeTax(income) {
  if (income <= 0) {
    return {
      personalAllowance: PERSONAL_ALLOWANCE,
      basicIncome: 0, basicTax: 0,
      higherIncome: 0, higherTax: 0,
      additionalIncome: 0, additionalTax: 0,
      totalTax: 0
    };
  }
  var pa = effectivePersonalAllowance(income);
  function inBand(from, to) {
    var cap = isFinite(to) ? to : income;
    return Math.max(0, Math.min(income, cap) - from);
  }
  var basicIncome      = inBand(pa, BASIC_RATE_UPPER);
  var higherIncome     = inBand(BASIC_RATE_UPPER, HIGHER_RATE_UPPER);
  var additionalIncome = inBand(HIGHER_RATE_UPPER, Infinity);

  var basicTax      = r2(basicIncome      * 0.20);
  var higherTax     = r2(higherIncome     * 0.40);
  var additionalTax = r2(additionalIncome * 0.45);
  var totalTax      = r2(basicTax + higherTax + additionalTax);

  return {
    personalAllowance: pa,
    basicIncome:      r2(basicIncome),
    basicTax:         basicTax,
    higherIncome:     r2(higherIncome),
    higherTax:        higherTax,
    additionalIncome: r2(additionalIncome),
    additionalTax:    additionalTax,
    totalTax:         totalTax
  };
}

// Corporation tax with marginal relief between £50k and £250k.
// Formula (HMRC): tax = profit * 25% - (250,000 - profit) * 3/200, applied between limits.
function calcCorporationTax(profit) {
  if (!isFinite(profit) || profit <= 0) return 0;
  if (profit <= CT_SMALL_PROFITS_LIMIT) return r2(profit * CT_SMALL_RATE);
  if (profit >= CT_UPPER_LIMIT)         return r2(profit * CT_MAIN_RATE);
  var tax = profit * CT_MAIN_RATE - (CT_UPPER_LIMIT - profit) * CT_MARGINAL_FRACTION;
  return r2(tax);
}

function highestBand(income) {
  if (income <= effectivePersonalAllowance(income)) return 'none';
  if (income <= BASIC_RATE_UPPER)  return 'basic';
  if (income <= HIGHER_RATE_UPPER) return 'higher';
  return 'additional';
}

function calculateSection24Impact(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('opts is required');
  var rentalIncome     = Number(opts.rentalIncome);
  var mortgageInterest = Number(opts.mortgageInterest);
  var otherExpenses    = Number(opts.otherExpenses);
  var otherIncome      = Number(opts.otherIncome);
  var isLimitedCompany = !!opts.isLimitedCompany;

  [['rentalIncome', rentalIncome], ['mortgageInterest', mortgageInterest],
   ['otherExpenses', otherExpenses], ['otherIncome', otherIncome]].forEach(function (pair) {
    if (!isFinite(pair[1]) || pair[1] < 0) {
      throw new Error(pair[0] + ' must be a non-negative number');
    }
  });

  // ─── Pre-2017 rules: full mortgage interest deduction ────────────────────
  // Rental profit = rental income - mortgage interest - other expenses.
  // If negative, the rental loss is NOT offset against other income (HMRC rules
  // carry it forward against future rental income). So for tax this year, we
  // add max(0, rentalProfit) to other income.
  var preRentalProfitRaw = rentalIncome - mortgageInterest - otherExpenses;
  var preRentalProfit    = Math.max(0, preRentalProfitRaw);
  var preTotalIncome     = otherIncome + preRentalProfit;
  var preTax             = calcIncomeTax(preTotalIncome);
  var preBand            = highestBand(preTotalIncome);

  // ─── Section 24 rules: mortgage interest NOT deductible, 20% credit instead ─
  var postRentalProfitRaw = rentalIncome - otherExpenses; // adjusted profit
  var postRentalProfit    = Math.max(0, postRentalProfitRaw);
  var postTotalIncome     = otherIncome + postRentalProfit;
  var postTax             = calcIncomeTax(postTotalIncome);
  var postBand            = highestBand(postTotalIncome);

  // Tax credit: 20% of the LOWER of:
  //  (a) finance costs (mortgage interest)
  //  (b) property profits (after losses) — postRentalProfit
  //  (c) adjusted total income above the personal allowance
  var adjustedTotalAbovePA = Math.max(0, postTotalIncome - postTax.personalAllowance);
  var creditBase = Math.min(mortgageInterest, postRentalProfit, adjustedTotalAbovePA);
  var taxCredit  = r2(creditBase * 0.20);
  var incomeTaxAfterCredit = r2(Math.max(0, postTax.totalTax - taxCredit));

  // Section 24 hit on the personal route: difference between current tax and
  // what the landlord would have paid under the pre-2017 rules.
  var section24Hit = r2(incomeTaxAfterCredit - preTax.totalTax);

  // Pushed into a higher band by Section 24?
  var bandOrder = { none: 0, basic: 1, higher: 2, additional: 3 };
  var pushedIntoHigherBand = bandOrder[postBand] > bandOrder[preBand];

  // ─── Limited company route ────────────────────────────────────────────────
  // Company keeps full deduction. Profit = rental income - MI - expenses.
  var companyProfit = Math.max(0, rentalIncome - mortgageInterest - otherExpenses);
  var corporationTax = calcCorporationTax(companyProfit);

  return {
    taxYear: TAX_YEAR,
    inputs: {
      rentalIncome:     r2(rentalIncome),
      mortgageInterest: r2(mortgageInterest),
      otherExpenses:    r2(otherExpenses),
      otherIncome:      r2(otherIncome),
      isLimitedCompany: isLimitedCompany
    },
    preSection24: {
      rentalProfit:        r2(preRentalProfitRaw),
      rentalProfitTaxable: r2(preRentalProfit),
      totalIncome:         r2(preTotalIncome),
      bands:               preTax,
      incomeTax:           preTax.totalTax,
      highestBand:         preBand
    },
    postSection24: {
      adjustedRentalProfit: r2(postRentalProfit),
      totalIncome:          r2(postTotalIncome),
      bands:                postTax,
      incomeTaxBeforeCredit: postTax.totalTax,
      creditBase:           r2(creditBase),
      taxCredit:            taxCredit,
      incomeTaxAfterCredit: incomeTaxAfterCredit,
      highestBand:          postBand
    },
    section24Hit:         section24Hit,
    pushedIntoHigherBand: pushedIntoHigherBand,
    limitedCompany: {
      profit:         r2(companyProfit),
      corporationTax: corporationTax,
      // Effective rate on profit
      effectiveRate:  companyProfit > 0 ? r2((corporationTax / companyProfit) * 100) : 0
    }
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calculateSection24Impact,
    calcIncomeTax,
    calcCorporationTax,
    effectivePersonalAllowance,
    TAX_YEAR
  };
}
if (typeof window !== 'undefined') {
  window.UKSection24 = { calculateSection24Impact, TAX_YEAR };
}
