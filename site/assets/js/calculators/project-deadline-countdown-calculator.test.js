'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./project-deadline-countdown-calculator.js');

// parseDateInput: accepts YYYY-MM-DD and DD/MM/YYYY
test('parseDateInput: YYYY-MM-DD parses to local date with no shift', () => {
  const d = lib.parseDateInput('2026-04-30');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 3); // April = 3
  assert.equal(d.getDate(), 30);
});

test('parseDateInput: DD/MM/YYYY parses correctly', () => {
  const d = lib.parseDateInput('30/04/2026');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 3);
  assert.equal(d.getDate(), 30);
});

test('parseDateInput: rejects nonsense', () => {
  assert.equal(lib.parseDateInput('not-a-date'), null);
  assert.equal(lib.parseDateInput(''), null);
  assert.equal(lib.parseDateInput('2026-13-40'), null);
});

test('parseHolidays: parses mixed list, ignores blanks and bad lines', () => {
  const text = '2026-04-03\n2026-04-06\n\n25/12/2026\n   \nbogus';
  const out = lib.parseHolidays(text);
  assert.equal(out.valid.length, 3);
  assert.equal(out.invalid.length, 1);
  assert.equal(out.invalid[0], 'bogus');
});

// countDays
test('calendar days: 30 Apr to 30 Apr is 0 calendar days', () => {
  const start = lib.parseDateInput('2026-04-30');
  const end = lib.parseDateInput('2026-04-30');
  assert.equal(lib.calendarDaysBetween(start, end), 0);
});

test('calendar days: 1 Apr to 30 Apr is 29 days', () => {
  const start = lib.parseDateInput('2026-04-01');
  const end = lib.parseDateInput('2026-04-30');
  assert.equal(lib.calendarDaysBetween(start, end), 29);
});

test('calendar days: deadline before start is negative', () => {
  const start = lib.parseDateInput('2026-04-30');
  const end = lib.parseDateInput('2026-04-25');
  assert.equal(lib.calendarDaysBetween(start, end), -5);
});

// countWorkingDays
test('working days: same start and deadline returns 0', () => {
  const d = lib.parseDateInput('2026-04-30');
  const result = lib.countWorkingDays(d, d, [1,2,3,4,5], []);
  assert.equal(result.workingDays, 0);
});

test('working days: 27 Apr (Mon) to 1 May (Fri) Mon-Fri excludes start = 4 working days', () => {
  // Mon 27, Tue 28, Wed 29, Thu 30, Fri 1 May. We count days strictly after start,
  // up to and including deadline, that are working days.
  const start = lib.parseDateInput('2026-04-27');
  const end = lib.parseDateInput('2026-05-01');
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], []);
  assert.equal(result.workingDays, 4);
});

test('working days: weekends excluded by default', () => {
  // Fri 1 May to Mon 4 May. Only Mon 4 May counts.
  const start = lib.parseDateInput('2026-05-01');
  const end = lib.parseDateInput('2026-05-04');
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], []);
  assert.equal(result.workingDays, 1);
});

test('working days: holiday on a weekday is excluded', () => {
  // 27 Apr Mon to 1 May Fri, with 30 Apr as a holiday. Should be 3 not 4.
  const start = lib.parseDateInput('2026-04-27');
  const end = lib.parseDateInput('2026-05-01');
  const holidays = [lib.parseDateInput('2026-04-30')];
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], holidays);
  assert.equal(result.workingDays, 3);
});

test('working days: holiday that falls on a weekend is not double-counted', () => {
  // Mon to Mon, Sat in middle marked as holiday. Should still be just the weekdays.
  const start = lib.parseDateInput('2026-04-27'); // Mon
  const end = lib.parseDateInput('2026-05-04');   // following Mon
  // Tue 28, Wed 29, Thu 30, Fri 1, Sat 2 (holiday but weekend), Sun 3, Mon 4 = 5 working
  const holidays = [lib.parseDateInput('2026-05-02')];
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], holidays);
  assert.equal(result.workingDays, 5);
});

test('working days: holiday on the deadline itself excluded', () => {
  const start = lib.parseDateInput('2026-04-27');
  const end = lib.parseDateInput('2026-05-01');
  const holidays = [lib.parseDateInput('2026-05-01')];
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], holidays);
  // Tue 28, Wed 29, Thu 30, Fri 1 (holiday) = 3 working days
  assert.equal(result.workingDays, 3);
});

test('working days: deadline in the past gives negative count', () => {
  // Today (start) is Mon 27 Apr 2026, deadline was Fri 24 Apr 2026.
  const start = lib.parseDateInput('2026-04-27');
  const end = lib.parseDateInput('2026-04-24');
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], []);
  // Past direction: count working days from deadline+1 up to start (weekdays in between).
  // Sat 25, Sun 26, Mon 27 (start, not counted). So 0 working weekdays between.
  // But Fri 24 was the deadline. We want a negative number meaning "deadline was X working days ago".
  // The natural reading: walk forward from deadline to start, count working days strictly after deadline up to start.
  // That gives Mon 27 only = 1 working day, so result is -1.
  assert.equal(result.workingDays, -1);
});

test('working days: all working days unchecked returns 0', () => {
  const start = lib.parseDateInput('2026-04-27');
  const end = lib.parseDateInput('2026-05-30');
  const result = lib.countWorkingDays(start, end, [], []);
  assert.equal(result.workingDays, 0);
});

test('working days: long-project sanity, full year Mon-Fri, no holidays', () => {
  const start = lib.parseDateInput('2026-01-01');
  const end = lib.parseDateInput('2026-12-31');
  const result = lib.countWorkingDays(start, end, [1,2,3,4,5], []);
  // 2026 has 261 weekdays. We exclude the start day itself.
  // 1 Jan 2026 is a Thursday and is a weekday, but excluded as start.
  // So 261 - 1 = 260.
  assert.equal(result.workingDays, 260);
});

// elapsedPercent
test('elapsedPercent: half-way through is 50%', () => {
  const startProject = lib.parseDateInput('2026-04-01');
  const today = lib.parseDateInput('2026-04-16');
  const deadline = lib.parseDateInput('2026-05-01');
  // 30 cal days total, 15 elapsed = 50%
  assert.equal(lib.elapsedPercent(startProject, today, deadline), 50);
});

test('elapsedPercent: zero-length project returns 100', () => {
  const d = lib.parseDateInput('2026-04-01');
  assert.equal(lib.elapsedPercent(d, d, d), 100);
});

test('elapsedPercent: project not yet started returns 0', () => {
  const startProject = lib.parseDateInput('2026-05-01');
  const today = lib.parseDateInput('2026-04-15');
  const deadline = lib.parseDateInput('2026-06-01');
  assert.equal(lib.elapsedPercent(startProject, today, deadline), 0);
});

test('elapsedPercent: clamps to 100 when past deadline', () => {
  const startProject = lib.parseDateInput('2026-04-01');
  const today = lib.parseDateInput('2026-06-01');
  const deadline = lib.parseDateInput('2026-05-01');
  assert.equal(lib.elapsedPercent(startProject, today, deadline), 100);
});

// UK 2026 bank holidays
test('UK_2026_BANK_HOLIDAYS contains 8 standard England & Wales dates', () => {
  assert.equal(lib.UK_2026_BANK_HOLIDAYS.length, 8);
  assert.ok(lib.UK_2026_BANK_HOLIDAYS.indexOf('2026-04-03') !== -1); // Good Friday
  assert.ok(lib.UK_2026_BANK_HOLIDAYS.indexOf('2026-12-25') !== -1); // Christmas Day
  assert.ok(lib.UK_2026_BANK_HOLIDAYS.indexOf('2026-12-28') !== -1); // Boxing Day substitute
});

// Registration files parse cleanly. Catches stray commas etc. introduced
// when adding the new calculator's entries by hand.
test('registration JSON files all parse', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '../../../..');
  ['categories.json', 'links.json', 'site/assets/search-index.json'].forEach((p) => {
    JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  });
});
