'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingTablePlanner = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  var MIN_TABLE_SIZE = 4;
  var MAX_TABLE_SIZE = 30;

  function configFor(guestsToSeat, size) {
    var tables     = Math.ceil(guestsToSeat / size);
    var totalSeats = tables * size;
    return {
      tableSize:    size,
      tablesNeeded: tables,
      totalSeats:   totalSeats,
      emptySeats:   totalSeats - guestsToSeat,
    };
  }

  function calculateWeddingTables(opts) {
    var guestCount     = opts.guestCount;
    var tableSize      = opts.tableSize      != null ? opts.tableSize      : 8;
    var topTableGuests = opts.topTableGuests != null ? opts.topTableGuests : 0;

    if (!guestCount || guestCount < 2)
      throw new Error('guestCount must be >= 2');
    if (tableSize < MIN_TABLE_SIZE || tableSize > MAX_TABLE_SIZE)
      throw new Error('tableSize must be between 4 and 30');
    if (topTableGuests < 0)
      throw new Error('topTableGuests must be >= 0');
    if (topTableGuests >= guestCount)
      throw new Error('topTableGuests must be less than guestCount');

    var guestsToSeat = guestCount - topTableGuests;
    var primary      = configFor(guestsToSeat, tableSize);

    // Show up to four alternative table sizes: ±2 and ±4 seats from the chosen size
    var altSizes = [tableSize - 4, tableSize - 2, tableSize + 2, tableSize + 4]
      .filter(function (s) { return s >= MIN_TABLE_SIZE && s <= MAX_TABLE_SIZE; });

    return {
      guestCount:     guestCount,
      tableSize:      tableSize,
      topTableGuests: topTableGuests,
      guestsToSeat:   guestsToSeat,
      tablesNeeded:   primary.tablesNeeded,
      totalSeats:     primary.totalSeats,
      emptySeats:     primary.emptySeats,
      alternatives:   altSizes.map(function (s) { return configFor(guestsToSeat, s); }),
    };
  }

  return { calculateWeddingTables: calculateWeddingTables };
}));
