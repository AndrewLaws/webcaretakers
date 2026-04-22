'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingCatering = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  // Gram weights per portion/piece (industry planning benchmarks)
  var CANAPE_PIECES_PER_PERSON = 6;    // for a 1.5-hour drinks reception
  var CANAPE_WEIGHT_G          = 25;   // per piece (mixed canapés average)
  var STARTER_G                = 130;  // per portion
  var MAIN_PROTEIN_G           = 200;  // per portion (cooked weight)
  var MAIN_VEG_G               = 120;  // per portion
  var MAIN_STARCH_G            = 130;  // per portion (potatoes, rice, etc.)
  var DESSERT_G                = 130;  // per portion
  var BUFFET_TOTAL_G           = 500;  // per person (all food combined)
  var EVENING_FOOD_G           = 300;  // per person (finger food, pizza, etc.)

  // Round grams to kg with one decimal place
  function toKg(grams) {
    return Math.round(grams / 100) / 10;
  }

  function calculateWeddingCatering(opts) {
    var guestCount       = opts.guestCount;
    var eveningGuests    = opts.eveningGuests    != null ? opts.eveningGuests    : 0;
    var includeCanapes   = opts.includeCanapes   !== false;
    var canapesPerPerson = opts.canapesPerPerson != null ? opts.canapesPerPerson : CANAPE_PIECES_PER_PERSON;
    var mealStyle        = opts.mealStyle        || 'formal';
    var courses          = opts.courses          != null ? opts.courses          : 3;

    if (!guestCount || guestCount < 2)
      throw new Error('guestCount must be >= 2');
    if (eveningGuests < 0)
      throw new Error('eveningGuests must be >= 0');
    if (canapesPerPerson < 0)
      throw new Error('canapesPerPerson must be >= 0');
    if (mealStyle !== 'formal' && mealStyle !== 'buffet')
      throw new Error('mealStyle must be "formal" or "buffet"');
    if (mealStyle === 'formal' && courses !== 2 && courses !== 3)
      throw new Error('courses must be 2 or 3');

    var totalEveningGuests = guestCount + eveningGuests;
    var totalCanapePieces  = includeCanapes ? guestCount * canapesPerPerson : 0;

    var canapes = {
      included:            includeCanapes,
      piecesPerPerson:     canapesPerPerson,
      totalPieces:         totalCanapePieces,
      approximateWeightKg: toKg(totalCanapePieces * CANAPE_WEIGHT_G),
    };

    var weddingBreakfast;
    if (mealStyle === 'buffet') {
      weddingBreakfast = {
        style:         'buffet',
        portions:      guestCount,
        totalWeightKg: toKg(guestCount * BUFFET_TOTAL_G),
      };
    } else {
      // 3-course: starter + main + dessert; 2-course: main + dessert
      var starterPortions = courses >= 3 ? guestCount : 0;
      weddingBreakfast = {
        style:           'formal',
        courses:         courses,
        starterPortions: starterPortions,
        mainPortions:    guestCount,
        dessertPortions: guestCount,
        starterWeightKg: toKg(starterPortions * STARTER_G),
        mainProteinKg:   toKg(guestCount * MAIN_PROTEIN_G),
        mainVegKg:       toKg(guestCount * MAIN_VEG_G),
        mainStarchKg:    toKg(guestCount * MAIN_STARCH_G),
        dessertWeightKg: toKg(guestCount * DESSERT_G),
      };
    }

    var eveningFood = {
      portions:            totalEveningGuests,
      approximateWeightKg: toKg(totalEveningGuests * EVENING_FOOD_G),
    };

    var teaAndCoffee = {
      servings: guestCount,
    };

    return {
      guestCount:         guestCount,
      eveningGuests:      eveningGuests,
      totalEveningGuests: totalEveningGuests,
      mealStyle:          mealStyle,
      courses:            mealStyle === 'formal' ? courses : null,
      canapes:            canapes,
      weddingBreakfast:   weddingBreakfast,
      eveningFood:        eveningFood,
      teaAndCoffee:       teaAndCoffee,
    };
  }

  return { calculateWeddingCatering: calculateWeddingCatering };
}));
