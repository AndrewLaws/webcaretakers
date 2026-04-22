'use strict';

/**
 * How many months old is a person (or anything) born on a given date?
 *
 * Inspired by the Parenting Hell podcast bit: adults should report their age
 * in months, like parents do with toddlers. "Oh he's 494 months, is he
 * sleeping through?"
 *
 * Returns total months (integer), plus a years/months/days decomposition
 * and total days/weeks for extra gag value.
 */

function parseYMD(str) {
  // Accepts "YYYY-MM-DD" and returns { y, m, d } with month in 1-12.
  if (typeof str !== 'string') return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  var d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // Validate day against month length (including leap years)
  var maxDay = daysInMonth(y, mo);
  if (d > maxDay) return null;
  return { y: y, m: mo, d: d };
}

function daysInMonth(year, month) {
  // month: 1-12. Handles roll-over for month 0 or 13.
  if (month < 1)  { year--; month += 12; }
  if (month > 12) { year++; month -= 12; }
  // Date(year, month, 0) returns the last day of the previous month (1-indexed here).
  return new Date(year, month, 0).getDate();
}

function todayYMD() {
  var n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
}

function cmp(a, b) {
  // Compare two { y, m, d } objects. Returns -1, 0, 1.
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

function calculateAgeInMonths(opts) {
  opts = opts || {};
  var birth = typeof opts.dob === 'string' ? parseYMD(opts.dob) : opts.dob;
  var now   = opts.today
    ? (typeof opts.today === 'string' ? parseYMD(opts.today) : opts.today)
    : todayYMD();

  if (!birth || typeof birth.y !== 'number') throw new Error('Invalid date of birth');
  if (!now   || typeof now.y   !== 'number') throw new Error('Invalid "today" date');
  if (cmp(birth, now) > 0) throw new Error('Date of birth is in the future');

  var years  = now.y - birth.y;
  var months = now.m - birth.m;
  var days   = now.d - birth.d;

  if (days < 0) {
    months--;
    // Borrow from the month before "now"
    days += daysInMonth(now.y, now.m - 1);
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  var totalMonths = years * 12 + months;

  // Total days via UTC millis (timezone-safe)
  var birthUTC = Date.UTC(birth.y, birth.m - 1, birth.d);
  var nowUTC   = Date.UTC(now.y,   now.m - 1,   now.d);
  var totalDays = Math.round((nowUTC - birthUTC) / 86400000);
  var totalWeeks = Math.floor(totalDays / 7);
  var totalHours = totalDays * 24;

  return {
    totalMonths:   totalMonths,
    years:         years,
    monthsOnly:    months,
    days:          days,
    totalDays:     totalDays,
    totalWeeks:    totalWeeks,
    totalHours:    totalHours,
    dob:           birth.y + '-' + String(birth.m).padStart(2, '0') + '-' + String(birth.d).padStart(2, '0'),
    today:         now.y   + '-' + String(now.m).padStart(2, '0')   + '-' + String(now.d).padStart(2, '0'),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateAgeInMonths, parseYMD, daysInMonth };
} else {
  window.AgeInMonths = { calculateAgeInMonths, parseYMD, daysInMonth };
}
