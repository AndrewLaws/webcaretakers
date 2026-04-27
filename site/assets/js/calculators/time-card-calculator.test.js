const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseHHMM,
  computeRow,
  computeWeek,
} = require('./time-card-calculator.js');

// --- parseHHMM ---

test('parseHHMM: accepts 09:30', () => {
  assert.equal(parseHHMM('09:30'), 9 * 60 + 30);
});

test('parseHHMM: accepts 0:00 (lenient single-digit hour)', () => {
  assert.equal(parseHHMM('0:00'), 0);
});

test('parseHHMM: accepts 23:59', () => {
  assert.equal(parseHHMM('23:59'), 23 * 60 + 59);
});

test('parseHHMM: rejects bad shapes', () => {
  assert.equal(parseHHMM('noon'), null);
  assert.equal(parseHHMM('25:00'), null);
  assert.equal(parseHHMM('09:60'), null);
  assert.equal(parseHHMM(''), null);
  assert.equal(parseHHMM('9'), null);
});

// --- computeRow ---

test('computeRow: 09:00 to 17:00 with 30 min break = 7.5 hours', () => {
  const r = computeRow({ start: '09:00', end: '17:00', breakMinutes: 30 });
  assert.equal(r.status, 'ok');
  assert.equal(r.hours, 7.5);
  assert.equal(r.netMinutes, 450);
  assert.equal(r.overnight, false);
});

test('computeRow: overnight shift 22:00 to 06:00 with 0 break = 8 hours', () => {
  const r = computeRow({ start: '22:00', end: '06:00', breakMinutes: 0 });
  assert.equal(r.status, 'ok');
  assert.equal(r.hours, 8);
  assert.equal(r.overnight, true);
});

test('computeRow: end equals start treated as overnight 24-hour shift', () => {
  // Per brief, end <= start triggers next-day rollover
  const r = computeRow({ start: '09:00', end: '09:00', breakMinutes: 0 });
  assert.equal(r.status, 'ok');
  assert.equal(r.hours, 24);
  assert.equal(r.overnight, true);
});

test('computeRow: break exactly equal to shift length = 0 hours, valid', () => {
  const r = computeRow({ start: '09:00', end: '10:00', breakMinutes: 60 });
  assert.equal(r.status, 'ok');
  assert.equal(r.hours, 0);
});

test('computeRow: break longer than shift is rejected', () => {
  const r = computeRow({ start: '09:00', end: '10:00', breakMinutes: 90 });
  assert.equal(r.status, 'invalid');
  assert.equal(r.reason, 'break-too-long');
});

test('computeRow: bad start time gives invalid status without throwing', () => {
  const r = computeRow({ start: 'banana', end: '17:00', breakMinutes: 0 });
  assert.equal(r.status, 'invalid');
});

test('computeRow: bad end time gives invalid status without throwing', () => {
  const r = computeRow({ start: '09:00', end: '17:99', breakMinutes: 0 });
  assert.equal(r.status, 'invalid');
});

test('computeRow: empty row (both blank) = empty status, no error', () => {
  const r = computeRow({ start: '', end: '', breakMinutes: 0 });
  assert.equal(r.status, 'empty');
});

test('computeRow: negative break is rejected', () => {
  const r = computeRow({ start: '09:00', end: '17:00', breakMinutes: -10 });
  assert.equal(r.status, 'invalid');
});

test('computeRow: rounds hours to 2 dp', () => {
  // 09:00 to 09:20, no break = 20/60 = 0.3333...
  const r = computeRow({ start: '09:00', end: '09:20', breakMinutes: 0 });
  assert.equal(r.hours, 0.33);
});

// --- computeWeek ---

test('computeWeek: sums valid rows, skips empty, ignores invalid', () => {
  const rows = [
    { day: 'Mon', start: '09:00', end: '17:00', breakMinutes: 30 }, // 7.5
    { day: 'Tue', start: '09:00', end: '17:30', breakMinutes: 30 }, // 8.0
    { day: 'Wed', start: '', end: '', breakMinutes: 0 },            // empty
    { day: 'Thu', start: 'rubbish', end: '17:00', breakMinutes: 0 }, // invalid
    { day: 'Fri', start: '08:00', end: '12:00', breakMinutes: 0 },  // 4.0
  ];
  const w = computeWeek({ rows });
  assert.equal(w.totalHours, 19.5);
  assert.equal(w.rows.length, 5);
  assert.equal(w.rows[2].status, 'empty');
  assert.equal(w.rows[3].status, 'invalid');
});

test('computeWeek: total pay when rate provided', () => {
  const rows = [
    { day: 'Mon', start: '09:00', end: '17:00', breakMinutes: 0 }, // 8h
  ];
  const w = computeWeek({ rows, hourlyRate: 12.5 });
  assert.equal(w.totalHours, 8);
  assert.equal(w.totalPay, 100);
});

test('computeWeek: totalPay is null when rate empty/invalid', () => {
  const rows = [
    { day: 'Mon', start: '09:00', end: '17:00', breakMinutes: 0 },
  ];
  const w = computeWeek({ rows });
  assert.equal(w.totalPay, null);

  const w2 = computeWeek({ rows, hourlyRate: 0 });
  assert.equal(w2.totalPay, null);

  const w3 = computeWeek({ rows, hourlyRate: NaN });
  assert.equal(w3.totalPay, null);
});

test('computeWeek: pay is rounded to 2dp', () => {
  const rows = [
    { day: 'Mon', start: '09:00', end: '09:20', breakMinutes: 0 }, // 20 min = 0.3333h
  ];
  const w = computeWeek({ rows, hourlyRate: 15 });
  // 20/60 * 15 = 5
  assert.equal(w.totalPay, 5);
});

test('computeWeek: handles overnight shifts in week total', () => {
  const rows = [
    { day: 'Fri', start: '22:00', end: '06:00', breakMinutes: 0 }, // 8h
    { day: 'Sat', start: '22:00', end: '06:00', breakMinutes: 60 }, // 7h
  ];
  const w = computeWeek({ rows });
  assert.equal(w.totalHours, 15);
});

test('computeWeek: empty rows list returns 0 total', () => {
  const w = computeWeek({ rows: [] });
  assert.equal(w.totalHours, 0);
  assert.equal(w.totalPay, null);
});
