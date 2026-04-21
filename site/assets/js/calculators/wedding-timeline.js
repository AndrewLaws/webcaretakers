'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingTimeline = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  // ── Date helpers ────────────────────────────────────────────────────────

  function isValidDate(str) {
    if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    var d = new Date(str + 'T12:00:00Z');
    return !isNaN(d.getTime());
  }

  function subtractMonths(dateStr, months) {
    var parts = dateStr.split('-');
    var year  = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1; // 0-indexed
    var day   = parseInt(parts[2], 10);

    var newMonth = month - months;
    var newYear  = year;
    while (newMonth < 0) { newMonth += 12; newYear -= 1; }
    while (newMonth > 11) { newMonth -= 12; newYear += 1; }

    // Clamp day to last day of target month
    var daysInMonth = new Date(Date.UTC(newYear, newMonth + 1, 0)).getUTCDate();
    var newDay = Math.min(day, daysInMonth);

    return (
      String(newYear).padStart(4, '0') + '-' +
      String(newMonth + 1).padStart(2, '0') + '-' +
      String(newDay).padStart(2, '0')
    );
  }

  function subtractDays(dateStr, days) {
    var d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  function daysBetween(earlier, later) {
    var a = new Date(earlier + 'T12:00:00Z');
    var b = new Date(later   + 'T12:00:00Z');
    return Math.round((b - a) / 86400000);
  }

  // ── Milestone definitions ───────────────────────────────────────────────
  // Each entry has monthsBefore -OR- weeksBefore -OR- daysBefore.
  // save-the-date months differ by isDestination flag.

  var MILESTONE_DEFS = [
    { id: 'book-venue',       name: 'Book your venue',                       monthsBefore: 15, category: 'venue',       note: 'Popular venues fill 12\u201318 months ahead. View several before committing.' },
    { id: 'photographer',     name: 'Book photographer and videographer',     monthsBefore: 12, category: 'vendors',     note: null },
    { id: 'caterer',          name: 'Book caterer',                           monthsBefore: 10, category: 'vendors',     note: null },
    { id: 'save-the-date',    name: 'Send save-the-dates',                   monthsBefore: null, category: 'save-the-date', note: null }, // set dynamically
    { id: 'hotel-blocks',     name: 'Reserve hotel room blocks for guests',   monthsBefore: 9,  category: 'logistics',  note: 'Guests appreciate a suggested hotel, especially for out-of-town weddings.' },
    { id: 'florist',          name: 'Book florist',                           monthsBefore: 8,  category: 'vendors',    note: null },
    { id: 'dress',            name: 'Order wedding dress or suit',            monthsBefore: 7,  category: 'attire',     note: 'Allow 4\u20136 months for production and 4\u20138 weeks for alterations.' },
    { id: 'honeymoon',        name: 'Book honeymoon',                         monthsBefore: 6,  category: 'travel',     note: null },
    { id: 'send-invitations', name: 'Send formal invitations',                weeksBefore: 8,   category: 'invitations',note: null },
    { id: 'marriage-licence', name: 'Apply for marriage licence',             weeksBefore: 4,   category: 'legal',      note: 'Requirements vary by country and register office. Check your local rules.' },
    { id: 'rsvp-deadline',    name: 'RSVP deadline',                          weeksBefore: 3,   category: 'rsvp',       note: null },
    { id: 'final-headcount',  name: 'Final headcount to venue and caterer',   weeksBefore: 2,   category: 'logistics',  note: null },
    { id: 'dress-fitting',    name: 'Final dress or suit fitting',            weeksBefore: 2,   category: 'attire',     note: null },
    { id: 'rehearsal',        name: 'Rehearsal and rehearsal dinner',         daysBefore: 1,    category: 'pre-wedding',note: null },
  ];

  // ── Main function ────────────────────────────────────────────────────────

  function calculateWeddingTimeline(opts) {
    var weddingDate  = opts.weddingDate;
    var isDestination = opts.isDestination || false;

    if (!weddingDate || !isValidDate(weddingDate)) {
      throw new Error('weddingDate must be a valid YYYY-MM-DD date string');
    }

    var saveTheDateMonths = isDestination ? 10 : 7;

    var milestones = MILESTONE_DEFS.map(function (def) {
      var months = def.id === 'save-the-date' ? saveTheDateMonths : def.monthsBefore;
      var date;
      if (months != null) {
        date = subtractMonths(weddingDate, months);
      } else if (def.weeksBefore != null) {
        date = subtractDays(weddingDate, def.weeksBefore * 7);
      } else {
        date = subtractDays(weddingDate, def.daysBefore);
      }

      var daysBeforeWedding = daysBetween(date, weddingDate);

      return {
        id:                def.id,
        name:              def.name,
        date:              date,
        daysBeforeWedding: daysBeforeWedding,
        category:          def.category,
        note:              def.note,
      };
    });

    milestones.sort(function (a, b) {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return  1;
      return 0;
    });

    return {
      weddingDate:   weddingDate,
      isDestination: isDestination,
      milestones:    milestones,
    };
  }

  return { calculateWeddingTimeline: calculateWeddingTimeline };
}));
