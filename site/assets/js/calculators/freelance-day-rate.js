'use strict';

function round2(n) {
  return Math.round(n * 100) / 100;
}

var DEFAULTS = {
  workingDaysPerYear: 260,   // 52 weeks × 5 days
  nonBillableDays:    40,    // holidays (25) + admin/training (15)
  annualExpenses:     0,
  pensionPercent:     5,
  downtimePercent:    15,    // % of available time with no client (gaps, sick, etc.)
};

/**
 * Calculate the day rate a freelancer needs to charge.
 *
 * The model:
 *   billable days  = workingDaysPerYear - nonBillableDays
 *   pension amount = annualIncomeTarget × pensionPercent / 100
 *   subtotal       = annualIncomeTarget + annualExpenses + pensionAmount
 *   totalRequired  = subtotal / (1 - downtimePercent / 100)   ← buffer for gaps
 *   day rate       = totalRequired / billableDays
 *
 * @param {object} opts
 * @param {number} opts.annualIncomeTarget  - Desired gross annual income (£)
 * @param {number} [opts.workingDaysPerYear] - Working days available (default 260)
 * @param {number} [opts.nonBillableDays]   - Non-billable days: holiday, admin (default 40)
 * @param {number} [opts.annualExpenses]    - Annual business costs £ (default 0)
 * @param {number} [opts.pensionPercent]    - % of income target to save for pension (default 5)
 * @param {number} [opts.downtimePercent]   - % allowance for gaps between clients (default 15)
 */
function calculateFreelanceDayRate(opts) {
  var income   = opts.annualIncomeTarget;
  var wDays    = (typeof opts.workingDaysPerYear === 'number') ? opts.workingDaysPerYear : DEFAULTS.workingDaysPerYear;
  var nbDays   = (typeof opts.nonBillableDays   === 'number') ? opts.nonBillableDays   : DEFAULTS.nonBillableDays;
  var expenses = (typeof opts.annualExpenses    === 'number') ? opts.annualExpenses    : DEFAULTS.annualExpenses;
  var pension  = (typeof opts.pensionPercent    === 'number') ? opts.pensionPercent    : DEFAULTS.pensionPercent;
  var downtime = (typeof opts.downtimePercent   === 'number') ? opts.downtimePercent   : DEFAULTS.downtimePercent;

  if (typeof income !== 'number' || income <= 0) throw new Error('annualIncomeTarget must be a positive number');
  if (wDays <= 0)                                throw new Error('workingDaysPerYear must be positive');
  if (nbDays < 0 || nbDays >= wDays)             throw new Error('nonBillableDays must be between 0 and workingDaysPerYear');
  if (expenses < 0)                              throw new Error('annualExpenses must be non-negative');
  if (pension < 0 || pension >= 100)             throw new Error('pensionPercent must be between 0 and 100');
  if (downtime < 0 || downtime >= 100)           throw new Error('downtimePercent must be between 0 and 100');

  var billableDays    = wDays - nbDays;
  var pensionAmount   = round2((income * pension) / 100);
  var subtotal        = round2(income + expenses + pensionAmount);
  var totalRequired   = round2(subtotal / (1 - downtime / 100));
  var downtimeBuffer  = round2(totalRequired - subtotal);

  var dayRate     = round2(totalRequired / billableDays);
  var halfDayRate = round2(dayRate / 2);
  var hourlyRate  = round2(dayRate / 8);
  var weeklyRate  = round2(dayRate * 5);
  // monthly rate based on actual billable days spread across 12 months
  var monthlyRate = round2((dayRate * billableDays) / 12);

  return {
    annualIncomeTarget: round2(income),
    workingDaysPerYear: wDays,
    nonBillableDays:    nbDays,
    billableDays,
    annualExpenses:     round2(expenses),
    pensionPercent:     pension,
    pensionAmount,
    downtimePercent:    downtime,
    subtotal,
    downtimeBuffer,
    totalRequired,
    dayRate,
    halfDayRate,
    hourlyRate,
    weeklyRate,
    monthlyRate,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateFreelanceDayRate, DEFAULTS };
} else {
  window.FreelanceDayRate = { calculateFreelanceDayRate, DEFAULTS };
}
