'use strict';

/**
 * How far apart are two dates?
 *
 * Returns a years/months/days breakdown plus totals in days, weeks, months,
 * hours and business days. Works in either direction: if the "to" date is
 * earlier than the "from" date we flip them and flag the result as reversed,
 * so the component numbers are always positive.
 */

function parseYMD(str) {
  if (typeof str !== 'string') return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  var d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (d > daysInMonth(y, mo)) return null;
  return { y: y, m: mo, d: d };
}

function daysInMonth(year, month) {
  if (month < 1)  { year--; month += 12; }
  if (month > 12) { year++; month -= 12; }
  return new Date(year, month, 0).getDate();
}

function cmp(a, b) {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

function ymdToUTC(d) { return Date.UTC(d.y, d.m - 1, d.d); }

function calculateDateDifference(opts) {
  opts = opts || {};
  var from = typeof opts.from === 'string' ? parseYMD(opts.from) : opts.from;
  var to   = typeof opts.to   === 'string' ? parseYMD(opts.to)   : opts.to;

  if (!from || typeof from.y !== 'number') throw new Error('Invalid "from" date');
  if (!to   || typeof to.y   !== 'number') throw new Error('Invalid "to" date');

  var reversed = false;
  if (cmp(from, to) > 0) {
    var tmp = from; from = to; to = tmp;
    reversed = true;
  }

  var years  = to.y - from.y;
  var months = to.m - from.m;
  var days   = to.d - from.d;

  if (days < 0) {
    months--;
    days += daysInMonth(to.y, to.m - 1);
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  var totalMonths = years * 12 + months;
  var totalDays   = Math.round((ymdToUTC(to) - ymdToUTC(from)) / 86400000);
  var totalWeeks  = Math.floor(totalDays / 7);
  var totalHours  = totalDays * 24;
  var businessDays = countBusinessDays(from, to);

  return {
    reversed:     reversed,
    years:        years,
    monthsOnly:   months,
    days:         days,
    totalMonths:  totalMonths,
    totalDays:    totalDays,
    totalWeeks:   totalWeeks,
    totalHours:   totalHours,
    businessDays: businessDays,
    from:         formatYMD(from),
    to:           formatYMD(to),
  };
}

function formatYMD(d) {
  return d.y + '-' + String(d.m).padStart(2, '0') + '-' + String(d.d).padStart(2, '0');
}

function countBusinessDays(from, to) {
  // Counts weekdays (Mon-Fri) between from (exclusive of start? no: inclusive) and to inclusive.
  // Convention used here: counts the number of Mon-Fri days in the closed interval [from, to].
  // For from == to on a weekday returns 1; on a weekend returns 0.
  var count = 0;
  var fromMs = ymdToUTC(from);
  var toMs   = ymdToUTC(to);
  for (var ms = fromMs; ms <= toMs; ms += 86400000) {
    var day = new Date(ms).getUTCDay(); // 0 Sun, 6 Sat
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateDateDifference, parseYMD, daysInMonth, countBusinessDays };
} else {
  window.DateDifference = { calculateDateDifference, parseYMD, daysInMonth, countBusinessDays };
}
