'use strict';

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.WeddingDayTimeline = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  // ── Time helpers ─────────────────────────────────────────────────────────

  function isValidTime(str) {
    if (typeof str !== 'string' || !/^\d{2}:\d{2}$/.test(str)) return false;
    var parts = str.split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }

  function parseMinutes(str) {
    var parts = str.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function formatMinutes(totalMinutes) {
    var m = ((totalMinutes % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  // ── Milestone definitions ────────────────────────────────────────────────
  // minutesFromCeremony: negative = before ceremony, positive = after.
  // Entries with fromEnd: true are calculated relative to receptionEndTime.

  var FIXED_MILESTONES = [
    { id: 'bridal-prep',       name: 'Bridal preparation (hair and makeup)',  minutesFromCeremony: -240, note: 'Allow 3\u20134 hours for hair, makeup, and getting dressed. Add 30 minutes if there is a large bridal party.' },
    { id: 'florist',           name: 'Florist delivery and decoration setup', minutesFromCeremony: -180, note: null },
    { id: 'groom-prep',        name: 'Groom and groomsmen preparation',       minutesFromCeremony: -120, note: null },
    { id: 'guests-arrive',     name: 'Guests arrive and are seated',          minutesFromCeremony:  -30, note: 'Venue doors typically open 30\u201345 minutes before the ceremony.' },
    { id: 'ceremony-start',    name: 'Ceremony begins',                       minutesFromCeremony:    0, note: null },
    { id: 'ceremony-end',      name: 'Ceremony ends',                         minutesFromCeremony:   45, note: 'Most ceremonies run 30\u201360 minutes.' },
    { id: 'confetti',          name: 'Confetti and congratulations',          minutesFromCeremony:   50, note: null },
    { id: 'group-photos',      name: 'Formal group photographs',              minutesFromCeremony:   60, note: 'Allow 30\u201345 minutes for group shots before joining the drinks reception.' },
    { id: 'drinks-reception',  name: 'Drinks reception and canapés',         minutesFromCeremony:   75, note: null },
    { id: 'wedding-breakfast', name: 'Wedding breakfast (sit-down meal)',     minutesFromCeremony:  165, note: null },
    { id: 'speeches',          name: 'Speeches',                              minutesFromCeremony:  195, note: 'Traditionally after the meal. Some couples move speeches to before it to let speakers relax and enjoy their food.' },
    { id: 'cake-cutting',      name: 'Cake cutting',                          minutesFromCeremony:  240, note: null },
  ];

  // ── Main function ────────────────────────────────────────────────────────

  function calculateWeddingDayTimeline(opts) {
    var ceremonyTime     = opts.ceremonyTime;
    var receptionEndTime = opts.receptionEndTime;

    if (!ceremonyTime || !isValidTime(ceremonyTime)) {
      throw new Error('ceremonyTime must be a valid HH:MM time string');
    }
    if (!receptionEndTime || !isValidTime(receptionEndTime)) {
      throw new Error('receptionEndTime must be a valid HH:MM time string');
    }

    var ceremonyMin = parseMinutes(ceremonyTime);
    var endMin      = parseMinutes(receptionEndTime);

    // Allow end time to be next day (e.g. ceremony 22:00, end 02:00)
    if (endMin <= ceremonyMin) endMin += 1440;

    if (endMin - ceremonyMin < 240) {
      throw new Error('receptionEndTime must be at least 4 hours after ceremonyTime');
    }

    var milestones = FIXED_MILESTONES.map(function (def) {
      var absMinutes = ceremonyMin + def.minutesFromCeremony;
      return {
        id:                  def.id,
        name:                def.name,
        time:                formatMinutes(absMinutes),
        minutesFromCeremony: def.minutesFromCeremony,
        note:                def.note,
      };
    });

    // End-relative milestones
    var firstDanceMin = endMin - 90;
    var lastSongMin   = endMin - 10;

    milestones.push({
      id:                  'first-dance',
      name:                'First dance',
      time:                formatMinutes(firstDanceMin),
      minutesFromCeremony: firstDanceMin - ceremonyMin,
      note:                null,
    });
    milestones.push({
      id:                  'last-song',
      name:                'Last song',
      time:                formatMinutes(lastSongMin),
      minutesFromCeremony: lastSongMin - ceremonyMin,
      note:                null,
    });
    milestones.push({
      id:                  'carriages',
      name:                'Carriages / end of reception',
      time:                formatMinutes(endMin),
      minutesFromCeremony: endMin - ceremonyMin,
      note:                null,
    });

    milestones.sort(function (a, b) { return a.minutesFromCeremony - b.minutesFromCeremony; });

    return {
      ceremonyTime:     ceremonyTime,
      receptionEndTime: receptionEndTime,
      milestones:       milestones,
    };
  }

  return { calculateWeddingDayTimeline: calculateWeddingDayTimeline };
}));
