'use strict';

// England, Wales and Northern Ireland — tax year 2025/26
var TAX_YEAR = '2025/26';
var PERSONAL_ALLOWANCE     = 12570;
var BASIC_RATE_UPPER       = 50270;   // top of basic-rate band
var HIGHER_RATE_UPPER      = 125140;  // top of higher-rate band / point PA reaches zero
var PA_TAPER_THRESHOLD     = 100000;  // PA starts tapering above this

// Employee Class 1 NI thresholds
var NI_PRIMARY_THRESHOLD   = 12570;
var NI_UPPER_LIMIT         = 50270;
var NI_MAIN_RATE           = 0.08;    // 8 % on £12,570 – £50,270
var NI_UPPER_RATE          = 0.02;    // 2 % above £50,270

var STUDENT_LOAN_PLANS = {
  none:    null,
  plan1:   { threshold: 24990,  rate: 0.09, label: 'Plan 1' },
  plan2:   { threshold: 27295,  rate: 0.09, label: 'Plan 2' },
  plan4:   { threshold: 31395,  rate: 0.09, label: 'Plan 4 (Scotland)' },
  plan5:   { threshold: 25000,  rate: 0.09, label: 'Plan 5 (post-Aug 2023)' },
  postgrad:{ threshold: 21000,  rate: 0.06, label: 'Postgraduate Loan' }
};

function r2(n) { return Math.round(n * 100) / 100; }

function effectivePersonalAllowance(gross) {
  if (gross <= PA_TAPER_THRESHOLD) return PERSONAL_ALLOWANCE;
  var reduction = Math.floor((gross - PA_TAPER_THRESHOLD) / 2);
  return Math.max(0, PERSONAL_ALLOWANCE - reduction);
}

function calcIncomeTax(gross) {
  var pa = effectivePersonalAllowance(gross);

  // Income in each band — the band boundaries stay fixed; the PA shifts which
  // portion of income sits in the 0 % zone.
  function inBand(from, to) {
    var cap = isFinite(to) ? to : gross;
    return Math.max(0, Math.min(gross, cap) - from);
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

function calcNI(gross) {
  var main     = Math.max(0, Math.min(gross, NI_UPPER_LIMIT) - NI_PRIMARY_THRESHOLD) * NI_MAIN_RATE;
  var upper    = Math.max(0, gross - NI_UPPER_LIMIT) * NI_UPPER_RATE;
  return r2(main + upper);
}

function calcStudentLoan(gross, plan) {
  var p = STUDENT_LOAN_PLANS[plan];
  if (!p) return 0;
  return r2(Math.max(0, gross - p.threshold) * p.rate);
}

function calculateUKSalaryTax(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('opts is required');

  var gross       = Number(opts.grossSalary);
  var studentLoan = opts.studentLoan || 'none';

  if (!isFinite(gross) || gross < 0) {
    throw new Error('grossSalary must be a non-negative number');
  }
  if (!Object.prototype.hasOwnProperty.call(STUDENT_LOAN_PLANS, studentLoan)) {
    throw new Error('invalid studentLoan plan: ' + studentLoan);
  }

  var tax  = calcIncomeTax(gross);
  var ni   = calcNI(gross);
  var sl   = calcStudentLoan(gross, studentLoan);

  var totalDeductions = r2(tax.totalTax + ni + sl);
  var takeHome        = r2(gross - totalDeductions);

  return {
    taxYear:              TAX_YEAR,
    grossAnnual:          r2(gross),
    grossMonthly:         r2(gross / 12),
    grossWeekly:          r2(gross / 52),
    incomeTax:            tax,
    nationalInsurance:    ni,
    studentLoan:          sl,
    studentLoanPlan:      studentLoan,
    totalDeductions:      totalDeductions,
    takeHomeAnnual:       takeHome,
    takeHomeMonthly:      r2(takeHome / 12),
    takeHomeWeekly:       r2(takeHome / 52),
    effectiveTaxRate:     gross > 0 ? r2((tax.totalTax    / gross) * 100) : 0,
    effectiveTotalRate:   gross > 0 ? r2((totalDeductions / gross) * 100) : 0
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calculateUKSalaryTax,
    effectivePersonalAllowance,
    calcIncomeTax,
    calcNI,
    calcStudentLoan,
    STUDENT_LOAN_PLANS,
    TAX_YEAR
  };
}
if (typeof window !== 'undefined') {
  window.UKSalaryTax = { calculateUKSalaryTax, STUDENT_LOAN_PLANS, TAX_YEAR };
}
