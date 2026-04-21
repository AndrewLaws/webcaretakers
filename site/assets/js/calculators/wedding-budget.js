'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingBudget = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  var CATEGORIES = [
    { id: 'venue',        name: 'Venue',                        percentage: 30 },
    { id: 'catering',     name: 'Catering and drink',           percentage: 35 },
    { id: 'photography',  name: 'Photography and videography',  percentage: 10 },
    { id: 'music',        name: 'Music and entertainment',      percentage:  5 },
    { id: 'flowers',      name: 'Flowers and decoration',       percentage:  7 },
    { id: 'attire',       name: 'Attire and beauty',            percentage:  8 },
    { id: 'stationery',   name: 'Stationery and invitations',   percentage:  1 },
    { id: 'transport',    name: 'Transport',                    percentage:  2 },
    { id: 'contingency',  name: 'Contingency',                  percentage:  2 },
  ];

  function calculateWeddingBudget(opts) {
    var totalBudget = opts.totalBudget;
    var guestCount  = opts.guestCount;

    if (!totalBudget || totalBudget <= 0) throw new Error('totalBudget must be > 0');
    if (!guestCount  || guestCount  <  2) throw new Error('guestCount must be >= 2');

    // Calculate amounts; distribute any rounding remainder onto contingency
    var allocated = 0;
    var categories = CATEGORIES.map(function (cat, i) {
      var amount;
      if (i < CATEGORIES.length - 1) {
        amount = Math.round(totalBudget * cat.percentage / 100 * 100) / 100;
        allocated += amount;
      } else {
        // Last category absorbs rounding difference
        amount = Math.round((totalBudget - allocated) * 100) / 100;
      }
      return {
        id:         cat.id,
        name:       cat.name,
        percentage: cat.percentage,
        amount:     amount,
      };
    });

    return {
      totalBudget:  totalBudget,
      guestCount:   guestCount,
      perHeadCost:  Math.round(totalBudget / guestCount * 100) / 100,
      categories:   categories,
    };
  }

  return { calculateWeddingBudget: calculateWeddingBudget };
}));
