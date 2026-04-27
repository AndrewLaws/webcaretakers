// Time Card Calculator: pure-logic helpers.
//
// A weekly timesheet. Each row is a day with start time, end time, and an
// unpaid break in minutes. Hours per row come from the gap between start and
// end, less the break, with overnight rollover when end <= start. Bad input
// on one row should not break the others, so we return a status per row
// rather than throwing.

// HH:MM, lenient on the leading zero. Returns minutes since midnight, or
// null if the input does not parse cleanly.
function parseHHMM(value) {
  if (typeof value !== 'string') return null;
  var m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  var h = parseInt(m[1], 10);
  var mins = parseInt(m[2], 10);
  if (h < 0 || h > 23) return null;
  if (mins < 0 || mins > 59) return null;
  return h * 60 + mins;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// One row of the timesheet. Returns one of:
// { status: 'empty' }
// { status: 'invalid', reason }
// { status: 'ok', hours, netMinutes, overnight, ... }
function computeRow(row) {
  var startStr = row && row.start ? String(row.start).trim() : '';
  var endStr   = row && row.end   ? String(row.end).trim()   : '';
  var breakMin = (row && typeof row.breakMinutes === 'number') ? row.breakMinutes : Number(row && row.breakMinutes) || 0;

  // A row is "empty" if both times are blank. Break alone does not count.
  if (!startStr && !endStr) {
    return { status: 'empty' };
  }

  if (!Number.isFinite(breakMin) || breakMin < 0) {
    return { status: 'invalid', reason: 'bad-break' };
  }

  var startMin = parseHHMM(startStr);
  var endMin   = parseHHMM(endStr);
  if (startMin === null || endMin === null) {
    return { status: 'invalid', reason: 'bad-time' };
  }

  // Overnight rollover: if end is on or before start, treat end as next day.
  var overnight = false;
  if (endMin <= startMin) {
    endMin += 24 * 60;
    overnight = true;
  }

  var grossMinutes = endMin - startMin;
  var netMinutes = grossMinutes - breakMin;

  if (netMinutes < 0) {
    return { status: 'invalid', reason: 'break-too-long' };
  }

  return {
    status: 'ok',
    startMinutes: startMin,
    endMinutes: endMin,
    grossMinutes: grossMinutes,
    breakMinutes: breakMin,
    netMinutes: netMinutes,
    hours: round2(netMinutes / 60),
    overnight: overnight,
  };
}

// Whole-week roll-up. Returns the per-row results and the aggregate totals.
// hourlyRate is optional; if missing, zero, or non-numeric, totalPay is null.
function computeWeek(input) {
  var rowsIn = (input && input.rows) || [];
  var rate = input && input.hourlyRate;
  var rateNumeric = typeof rate === 'number' ? rate : parseFloat(rate);
  var hasRate = Number.isFinite(rateNumeric) && rateNumeric > 0;

  var results = rowsIn.map(function (r) {
    var computed = computeRow(r);
    computed.day = (r && r.day) || '';
    return computed;
  });

  var totalMinutes = results.reduce(function (acc, r) {
    return acc + (r.status === 'ok' ? r.netMinutes : 0);
  }, 0);
  var totalHours = round2(totalMinutes / 60);

  var totalPay = null;
  if (hasRate) {
    totalPay = round2((totalMinutes / 60) * rateNumeric);
  }

  return {
    rows: results,
    totalMinutes: totalMinutes,
    totalHours: totalHours,
    totalPay: totalPay,
    hourlyRate: hasRate ? rateNumeric : null,
  };
}

var exported = {
  parseHHMM: parseHHMM,
  computeRow: computeRow,
  computeWeek: computeWeek,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.TimeCardCalculator = exported;
}
