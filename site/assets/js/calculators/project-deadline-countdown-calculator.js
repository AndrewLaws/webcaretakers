'use strict';

/**
 * Project Deadline Countdown Calculator: pure-logic library.
 *
 * All dates are treated as local calendar dates with no time component.
 * The Date constructor is called with explicit Y, M-1, D so that browser and
 * Node both anchor the date at local midnight, sidestepping the classic
 * "I entered 2026-04-30 but it reads as 2026-05-01" timezone trap that hits
 * naive `new Date('2026-04-30')` parsing.
 *
 * Working day rule:
 *   - Walk forward from start (exclusive) to deadline (inclusive).
 *   - A day counts if its weekday is in the user-selected working-days set,
 *     AND its YYYY-MM-DD is not in the holidays set.
 *   - Holidays that fall on a non-working weekday are simply excluded once;
 *     they cannot push the total negative.
 *   - If the deadline is before the start, the count is negative: walk
 *     forward from deadline (exclusive) to start (inclusive) and negate.
 */

// Pre-baked England & Wales bank holidays for 2026. Dates are taken from
// gov.uk as published. Boxing Day 2026 falls on a Saturday, so the
// substitute is Mon 28 Dec 2026.
var UK_2026_BANK_HOLIDAYS = [
  '2026-01-01', // New Year's Day
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-04', // Early May Bank Holiday
  '2026-05-25', // Spring Bank Holiday
  '2026-08-31', // Summer Bank Holiday
  '2026-12-25', // Christmas Day
  '2026-12-28'  // Boxing Day (substitute)
];

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function toIsoDateString(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function makeLocalDate(y, m, d) {
  // m is 1-based here; we shift to 0-based for Date.
  var dt = new Date(y, m - 1, d);
  // Validate: catch 2026-13-40 style nonsense, where the Date constructor
  // would silently roll over to the next valid date.
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function parseDateInput(input) {
  if (input === null || input === undefined) return null;
  var s = String(input).trim();
  if (s === '') return null;

  var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    return makeLocalDate(parseInt(iso[1], 10), parseInt(iso[2], 10), parseInt(iso[3], 10));
  }
  var dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmy) {
    return makeLocalDate(parseInt(dmy[3], 10), parseInt(dmy[2], 10), parseInt(dmy[1], 10));
  }
  return null;
}

function parseHolidays(text) {
  if (text === null || text === undefined) return { valid: [], invalid: [] };
  var lines = String(text).split(/\r?\n/);
  var valid = [];
  var invalid = [];
  var seen = {};
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === '') continue;
    var d = parseDateInput(line);
    if (d) {
      var key = toIsoDateString(d);
      if (!seen[key]) {
        seen[key] = true;
        valid.push(d);
      }
    } else {
      invalid.push(line);
    }
  }
  return { valid: valid, invalid: invalid };
}

var MS_PER_DAY = 24 * 60 * 60 * 1000;

function calendarDaysBetween(start, end) {
  // Returns end - start in whole calendar days. Negative if end < start.
  // We compute via UTC midnight to avoid DST putting a 23h or 25h day
  // into the integer division.
  var a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  var b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

function isWorkingDay(date, workingWeekdays, holidaySet) {
  // workingWeekdays: array of integers 0=Sun..6=Sat
  // holidaySet: object keyed by YYYY-MM-DD
  var dow = date.getDay();
  if (workingWeekdays.indexOf(dow) === -1) return false;
  if (holidaySet[toIsoDateString(date)]) return false;
  return true;
}

function buildHolidaySet(holidays) {
  var set = {};
  if (Array.isArray(holidays)) {
    for (var i = 0; i < holidays.length; i++) {
      var h = holidays[i];
      if (h && typeof h.getFullYear === 'function') {
        set[toIsoDateString(h)] = true;
      } else if (typeof h === 'string') {
        var p = parseDateInput(h);
        if (p) set[toIsoDateString(p)] = true;
      }
    }
  }
  return set;
}

function countWorkingDays(start, deadline, workingWeekdays, holidays) {
  // Returns:
  //   workingDays: integer (negative when deadline is before start)
  //   workingDates: array of Date objects for the days that counted
  //   holidaysHit: array of YYYY-MM-DD strings whose dates fell within the range
  //                AND would otherwise have been a working weekday
  if (!Array.isArray(workingWeekdays)) workingWeekdays = [];
  var holidaySet = buildHolidaySet(holidays);

  var diff = calendarDaysBetween(start, deadline);
  if (diff === 0) {
    return { workingDays: 0, workingDates: [], holidaysHit: [] };
  }

  var sign = diff > 0 ? 1 : -1;
  var from, to;
  if (sign === 1) {
    from = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    to = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  } else {
    from = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate() + 1);
    to = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  }

  var count = 0;
  var workingDates = [];
  var holidaysHit = [];
  var cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // Safety stop: cap at 20 years. A project longer than that is almost
  // certainly a typo and we do not want to spin a tab forever.
  var safetyMax = 366 * 20;
  var steps = 0;
  while (cursor.getTime() <= to.getTime() && steps < safetyMax) {
    var key = toIsoDateString(cursor);
    var dow = cursor.getDay();
    var isWeekday = workingWeekdays.indexOf(dow) !== -1;
    if (isWeekday && holidaySet[key]) {
      holidaysHit.push(key);
    }
    if (isWeekday && !holidaySet[key]) {
      count += 1;
      workingDates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    steps += 1;
  }

  return { workingDays: sign * count, workingDates: workingDates, holidaysHit: holidaysHit };
}

function elapsedPercent(startProject, today, deadline) {
  var total = calendarDaysBetween(startProject, deadline);
  if (total <= 0) return 100;
  var elapsed = calendarDaysBetween(startProject, today);
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  return Math.round((elapsed / total) * 100);
}

var api = {
  UK_2026_BANK_HOLIDAYS: UK_2026_BANK_HOLIDAYS,
  parseDateInput: parseDateInput,
  parseHolidays: parseHolidays,
  toIsoDateString: toIsoDateString,
  calendarDaysBetween: calendarDaysBetween,
  countWorkingDays: countWorkingDays,
  isWorkingDay: isWorkingDay,
  buildHolidaySet: buildHolidaySet,
  elapsedPercent: elapsedPercent
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.ProjectDeadlineCountdown = api;
}
