'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingAnniversary = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  // Traditional (UK) anniversary gift themes by year
  var TRADITIONAL = {
    1: 'Paper',           2: 'Cotton',          3: 'Leather',
    4: 'Fruit and flowers', 5: 'Wood',           6: 'Sugar',
    7: 'Wool',            8: 'Pottery',          9: 'Willow',
    10: 'Tin',            11: 'Steel',           12: 'Silk',
    13: 'Lace',           14: 'Ivory',           15: 'Crystal',
    20: 'China',          25: 'Silver',          30: 'Pearl',
    35: 'Coral',          40: 'Ruby',            45: 'Sapphire',
    50: 'Gold',           55: 'Emerald',         60: 'Diamond',
    65: 'Blue sapphire',  70: 'Platinum',
  };

  // Modern gift themes by year
  var MODERN = {
    1: 'Clocks',             2: 'China',             3: 'Crystal or glass',
    4: 'Appliances',         5: 'Silverware',         6: 'Wood',
    7: 'Desk sets',          8: 'Linens',             9: 'Leather',
    10: 'Diamond jewellery', 11: 'Fashion jewellery', 12: 'Pearls',
    13: 'Textiles',          14: 'Gold jewellery',    15: 'Watches',
    20: 'Platinum',          25: 'Silver',            30: 'Diamond',
    35: 'Jade',              40: 'Ruby',              45: 'Sapphire',
    50: 'Gold',              55: 'Emerald',           60: 'Diamond',
    65: 'Blue sapphire',     70: 'Platinum',
  };

  // Named milestone anniversaries
  var MILESTONES = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  // Returns UTC timestamp for the anniversary in targetYear,
  // clamping Feb 29 to Feb 28 in non-leap years.
  function anniversaryMs(wMon, wDay, targetYear) {
    var day = (wMon === 1 && wDay === 29 && !isLeapYear(targetYear)) ? 28 : wDay;
    return Date.UTC(targetYear, wMon, day);
  }

  function calculateWeddingAnniversary(opts) {
    var weddingDate   = opts.weddingDate;
    var referenceDate = opts.referenceDate || new Date();

    if (!weddingDate || !/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
      throw new Error('weddingDate must be a valid YYYY-MM-DD string');
    }

    var wp    = weddingDate.split('-');
    var wYear = parseInt(wp[0], 10);
    var wMon  = parseInt(wp[1], 10) - 1;  // 0-indexed month
    var wDay  = parseInt(wp[2], 10);

    // Normalise reference to a UTC midnight timestamp
    var ref;
    if (typeof referenceDate === 'string') {
      var rp = referenceDate.split('-');
      ref = Date.UTC(parseInt(rp[0], 10), parseInt(rp[1], 10) - 1, parseInt(rp[2], 10));
    } else {
      ref = Date.UTC(
        referenceDate.getFullYear(),
        referenceDate.getMonth(),
        referenceDate.getDate()
      );
    }

    var weddingMs = Date.UTC(wYear, wMon, wDay);

    if (weddingMs >= ref) {
      throw new Error('weddingDate must be in the past');
    }

    var refYear = new Date(ref).getUTCFullYear();

    // Years fully completed since the wedding
    var years       = refYear - wYear;
    var annThisYear = anniversaryMs(wMon, wDay, refYear);

    // If the anniversary date this year is still in the future, subtract one
    if (ref < annThisYear) years -= 1;

    var isToday          = (ref === annThisYear);
    var nextYear         = years + 1;
    var nextAnnMs        = anniversaryMs(wMon, wDay, wYear + nextYear);
    var daysUntil        = Math.round((nextAnnMs - ref) / 86400000);

    var upcomingMilestones = MILESTONES
      .filter(function (m) { return m > years; })
      .slice(0, 5)
      .map(function (m) {
        return {
          year:        m,
          traditional: TRADITIONAL[m] || null,
          modern:      MODERN[m]      || null,
          yearsAway:   m - years,
          calendarYear: wYear + m,
        };
      });

    return {
      weddingDate:              weddingDate,
      anniversaryYear:          years,
      traditional:              TRADITIONAL[years] || null,
      modern:                   MODERN[years]      || null,
      nextAnniversaryYear:      nextYear,
      daysUntilNextAnniversary: daysUntil,
      isAnniversaryToday:       isToday,
      upcomingMilestones:       upcomingMilestones,
    };
  }

  return { calculateWeddingAnniversary: calculateWeddingAnniversary };
}));
