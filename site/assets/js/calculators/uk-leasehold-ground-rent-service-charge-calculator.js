'use strict';

// UK Leasehold Ground Rent & Service Charge Calculator: pure-logic helpers.
//
// Projects a leaseholder's annual costs over a chosen horizon. Ground rent
// follows one of four escalation patterns common in UK leases:
//   - fixed:            the same figure every year
//   - doublingEvery10:  doubles after every 10 years
//   - doublingEvery25:  doubles after every 25 years (a frequent older clause)
//   - rpiLinked:        compounds annually at a stated assumption
//
// The Leasehold Reform (Ground Rent) Act 2022 caps ground rent at a
// peppercorn (effectively zero) for new long residential leases granted
// after 30 June 2022. When the peppercorn flag is set the projection
// returns zero across every year regardless of the escalation rule.
//
// Service charge is projected by compounding the supplied annual inflation
// rate against the current figure.

var ESCALATION_TYPES = ['fixed', 'doublingEvery10', 'doublingEvery25', 'rpiLinked'];

function r2(n) {
  return Math.round(n * 100) / 100;
}

function assertNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(name + ' must be a finite number');
  }
}

function assertNonNegative(value, name) {
  assertNumber(value, name);
  if (value < 0) {
    throw new Error(name + ' must be zero or positive');
  }
}

function assertYears(years) {
  assertNumber(years, 'years');
  if (years < 1 || years > 50 || years !== Math.floor(years)) {
    throw new Error('years must be a whole number between 1 and 50');
  }
}

// Returns an array of length `years`, the projected ground rent for each
// year (year 1 first). If peppercorn is true, every entry is zero.
function projectGroundRent(opts) {
  var currentGroundRent = opts.currentGroundRent;
  var escalationType = opts.escalationType;
  var rpiAssumption = opts.rpiAssumption || 0;
  var years = opts.years;
  var peppercorn = !!opts.peppercorn;

  assertNonNegative(currentGroundRent, 'currentGroundRent');
  assertYears(years);
  if (ESCALATION_TYPES.indexOf(escalationType) === -1) {
    throw new Error('escalationType must be one of: ' + ESCALATION_TYPES.join(', '));
  }

  var out = [];
  for (var y = 1; y <= years; y++) {
    if (peppercorn) {
      out.push(0);
      continue;
    }
    var amt;
    if (escalationType === 'fixed') {
      amt = currentGroundRent;
    } else if (escalationType === 'doublingEvery10') {
      // Year 1-10 stays at base. Year 11-20 doubles once. And so on.
      var doublings10 = Math.floor((y - 1) / 10);
      amt = currentGroundRent * Math.pow(2, doublings10);
    } else if (escalationType === 'doublingEvery25') {
      var doublings25 = Math.floor((y - 1) / 25);
      amt = currentGroundRent * Math.pow(2, doublings25);
    } else {
      // rpiLinked: compound annually
      assertNonNegative(rpiAssumption, 'rpiAssumption');
      amt = currentGroundRent * Math.pow(1 + rpiAssumption / 100, y - 1);
    }
    out.push(r2(amt));
  }
  return out;
}

function projectServiceCharge(opts) {
  var currentServiceCharge = opts.currentServiceCharge;
  var inflation = opts.serviceChargeInflation;
  var years = opts.years;

  assertNonNegative(currentServiceCharge, 'currentServiceCharge');
  assertNumber(inflation, 'serviceChargeInflation');
  assertYears(years);

  var out = [];
  for (var y = 1; y <= years; y++) {
    var amt = currentServiceCharge * Math.pow(1 + inflation / 100, y - 1);
    out.push(r2(amt));
  }
  return out;
}

function calculateLeasehold(args) {
  var groundRentSeries = projectGroundRent({
    currentGroundRent: args.currentGroundRent,
    escalationType: args.escalationType,
    rpiAssumption: args.rpiAssumption,
    years: args.years,
    peppercorn: !!args.peppercorn,
  });
  var serviceChargeSeries = projectServiceCharge({
    currentServiceCharge: args.currentServiceCharge,
    serviceChargeInflation: args.serviceChargeInflation,
    years: args.years,
  });

  var rows = [];
  var totalGroundRent = 0;
  var totalServiceCharge = 0;
  for (var i = 0; i < args.years; i++) {
    var gr = groundRentSeries[i];
    var sc = serviceChargeSeries[i];
    var combined = r2(gr + sc);
    totalGroundRent = r2(totalGroundRent + gr);
    totalServiceCharge = r2(totalServiceCharge + sc);
    rows.push({
      year: i + 1,
      groundRent: gr,
      serviceCharge: sc,
      combined: combined,
    });
  }
  var totalCombined = r2(totalGroundRent + totalServiceCharge);
  var averageMonthly = r2(totalCombined / (args.years * 12));

  return {
    years: rows,
    totalGroundRent: totalGroundRent,
    totalServiceCharge: totalServiceCharge,
    totalCombined: totalCombined,
    averageMonthly: averageMonthly,
    peppercorn: !!args.peppercorn,
    escalationType: args.escalationType,
  };
}

var exported = {
  calculateLeasehold: calculateLeasehold,
  projectGroundRent: projectGroundRent,
  projectServiceCharge: projectServiceCharge,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.UkLeaseholdCalc = exported;
}
