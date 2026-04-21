'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingDrinks = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  var STYLE_MULTIPLIER = { light: 0.7, moderate: 1.0, heavy: 1.4 };

  // Glasses per person per hour at each phase (base rate, moderate)
  var RATE_PRE    = 1.5;
  var RATE_MEAL   = 1.0;
  var RATE_EVENING = 1.5;

  // Drink mix by phase (fractions must sum to 1.0 per phase)
  var MIX_PRE     = { white: 0.25, red: 0.15, prosecco: 0.10, beer: 0.35, soft: 0.15 };
  var MIX_MEAL    = { white: 0.35, red: 0.25, prosecco: 0,    beer: 0.15, soft: 0.25 };
  var MIX_EVENING = { white: 0.20, red: 0.10, prosecco: 0,    beer: 0.45, spirits: 0.15, soft: 0.10 };

  // Serving sizes
  var GLASSES_PER_WINE_BOTTLE     = 5;   // 750 ml, ~150 ml per glass
  var GLASSES_PER_PROSECCO_BOTTLE = 6;   // 750 ml, ~125 ml per flute
  var ML_PER_SOFT_GLASS           = 400; // 400 ml per glass
  var MEASURES_PER_SPIRIT_BOTTLE  = 28;  // 700 ml, 25 ml measures

  function calculateWeddingDrinks(opts) {
    var guestCount         = opts.guestCount;
    var preReceptionHours  = opts.preReceptionHours  != null ? opts.preReceptionHours  : 1.5;
    var mealHours          = opts.mealHours          != null ? opts.mealHours          : 2.5;
    var eveningHours       = opts.eveningHours       != null ? opts.eveningHours       : 4;
    var drinkingStyle      = opts.drinkingStyle      || 'moderate';
    var includeToast       = opts.includeToast       !== false;

    if (!guestCount || guestCount < 2)   throw new Error('guestCount must be >= 2');
    if (preReceptionHours < 0)           throw new Error('preReceptionHours must be >= 0');
    if (mealHours          < 0)          throw new Error('mealHours must be >= 0');
    if (eveningHours       < 0)          throw new Error('eveningHours must be >= 0');

    var mult = STYLE_MULTIPLIER[drinkingStyle] || 1.0;

    // Glasses per person per phase
    var preG     = RATE_PRE     * mult * preReceptionHours;
    var mealG    = RATE_MEAL    * mult * mealHours;
    var eveningG = RATE_EVENING * mult * eveningHours;

    // Glasses per person by drink type
    var white    = preG * MIX_PRE.white    + mealG * MIX_MEAL.white    + eveningG * MIX_EVENING.white;
    var red      = preG * MIX_PRE.red      + mealG * MIX_MEAL.red      + eveningG * MIX_EVENING.red;
    var prosecco = preG * MIX_PRE.prosecco + (includeToast ? 1 : 0);
    var beer     = preG * MIX_PRE.beer     + mealG * MIX_MEAL.beer     + eveningG * MIX_EVENING.beer;
    var spirits  =                                                         eveningG * MIX_EVENING.spirits;
    var soft     = preG * MIX_PRE.soft     + mealG * MIX_MEAL.soft     + eveningG * MIX_EVENING.soft;

    var totalPerPerson = white + red + prosecco + beer + spirits + soft;

    return {
      guestCount:       guestCount,
      drinkingStyle:    drinkingStyle,
      includeToast:     includeToast,
      glassesPerPerson: Math.round(totalPerPerson * 10) / 10,
      totalGlasses:     Math.round(totalPerPerson * guestCount),
      whiteWineBottles:  Math.ceil(white    * guestCount / GLASSES_PER_WINE_BOTTLE),
      redWineBottles:    Math.ceil(red      * guestCount / GLASSES_PER_WINE_BOTTLE),
      proseccoBottles:   Math.ceil(prosecco * guestCount / GLASSES_PER_PROSECCO_BOTTLE),
      beerAndCiderCans:  Math.ceil(beer     * guestCount),
      spiritBottles:     Math.ceil(spirits  * guestCount / MEASURES_PER_SPIRIT_BOTTLE),
      softDrinkLitres:   Math.ceil(soft     * guestCount * ML_PER_SOFT_GLASS / 1000),
    };
  }

  return { calculateWeddingDrinks: calculateWeddingDrinks };
}));
