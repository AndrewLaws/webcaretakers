'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { generateICalString } = require('./ical-generator.js');

// ── Basic timed UTC event ──────────────────────────────────────────────────
test('basic timed UTC event has correct DTSTART, DTEND, SUMMARY', () => {
  const ical = generateICalString({
    title: 'Team meeting',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    timezone: 'UTC',
    uid: 'test-uid-basic',
  });
  assert.ok(ical.includes('DTSTART:20260501T100000Z'), 'DTSTART wrong');
  assert.ok(ical.includes('DTEND:20260501T110000Z'), 'DTEND wrong');
  assert.ok(ical.includes('SUMMARY:Team meeting'), 'SUMMARY wrong');
  assert.ok(ical.includes('UID:test-uid-basic'), 'UID wrong');
  assert.ok(ical.includes('BEGIN:VCALENDAR'), 'missing BEGIN:VCALENDAR');
  assert.ok(ical.includes('END:VEVENT'), 'missing END:VEVENT');
  assert.ok(ical.includes('END:VCALENDAR'), 'missing END:VCALENDAR');
});

// ── All-day event: DTEND is next day ─────────────────────────────────────
test('single all-day event uses VALUE=DATE and DTEND is next day', () => {
  const ical = generateICalString({
    title: 'Holiday',
    startDate: '2026-12-25',
    endDate: '2026-12-25',
    allDay: true,
    uid: 'test-uid-allday',
  });
  assert.ok(ical.includes('DTSTART;VALUE=DATE:20261225'), 'DTSTART wrong');
  assert.ok(ical.includes('DTEND;VALUE=DATE:20261226'), 'DTEND should be +1 day');
  assert.ok(!ical.includes('T102'), 'no time component expected');
});

// ── Multi-day all-day event ───────────────────────────────────────────────
test('multi-day all-day event: DTEND is endDate + 1', () => {
  const ical = generateICalString({
    title: 'Conference',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    allDay: true,
    uid: 'test-uid-multi',
  });
  assert.ok(ical.includes('DTSTART;VALUE=DATE:20260601'), 'DTSTART wrong');
  assert.ok(ical.includes('DTEND;VALUE=DATE:20260604'), 'DTEND should be endDate+1=June 4');
});

// ── Named timezone uses TZID ──────────────────────────────────────────────
test('named timezone adds TZID parameter, no trailing Z', () => {
  const ical = generateICalString({
    title: 'Call',
    startDate: '2026-05-01',
    startTime: '09:00',
    endDate: '2026-05-01',
    endTime: '10:00',
    timezone: 'Europe/London',
    uid: 'test-uid-tz',
  });
  assert.ok(ical.includes('DTSTART;TZID=Europe/London:20260501T090000'), 'DTSTART wrong');
  assert.ok(ical.includes('DTEND;TZID=Europe/London:20260501T100000'), 'DTEND wrong');
  // Ensure no UTC Z on these lines
  assert.ok(!ical.includes('DTSTART;TZID=Europe/London:20260501T090000Z'), 'should not have Z');
});

// ── Floating time (no timezone marker) ───────────────────────────────────
test('floating timezone uses no TZID and no Z', () => {
  const ical = generateICalString({
    title: 'Local event',
    startDate: '2026-05-01',
    startTime: '09:00',
    endDate: '2026-05-01',
    endTime: '10:00',
    timezone: 'floating',
    uid: 'test-uid-float',
  });
  assert.ok(ical.includes('DTSTART:20260501T090000\r\n'), 'DTSTART should be floating');
  assert.ok(!ical.includes('TZID'), 'should not contain TZID');
});

// ── Text escaping ──────────────────────────────────────────────────────────
test('commas in title are escaped', () => {
  const ical = generateICalString({
    title: 'Q1 review, retrospective',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    uid: 'test-uid-comma',
  });
  assert.ok(ical.includes('SUMMARY:Q1 review\\, retrospective'), 'comma not escaped');
});

test('semicolons in description are escaped', () => {
  const ical = generateICalString({
    title: 'Event',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    description: 'Agenda; AOB',
    uid: 'test-uid-semi',
  });
  assert.ok(ical.includes('DESCRIPTION:Agenda\\; AOB'), 'semicolon not escaped');
});

// ── Optional fields ────────────────────────────────────────────────────────
test('location is included when provided', () => {
  const ical = generateICalString({
    title: 'Standup',
    startDate: '2026-05-01',
    startTime: '09:00',
    endDate: '2026-05-01',
    endTime: '09:15',
    location: 'Conference Room B',
    uid: 'test-uid-loc',
  });
  assert.ok(ical.includes('LOCATION:Conference Room B'), 'LOCATION not found');
});

test('location is omitted when empty', () => {
  const ical = generateICalString({
    title: 'Standup',
    startDate: '2026-05-01',
    startTime: '09:00',
    endDate: '2026-05-01',
    endTime: '09:15',
    uid: 'test-uid-noloc',
  });
  assert.ok(!ical.includes('LOCATION'), 'LOCATION should be absent');
});

test('URL is included when provided', () => {
  const ical = generateICalString({
    title: 'Webinar',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    url: 'https://example.com/meeting',
    uid: 'test-uid-url',
  });
  assert.ok(ical.includes('URL:https://example.com/meeting'), 'URL not found');
});

// ── Recurrence ─────────────────────────────────────────────────────────────
test('weekly recurrence adds RRULE:FREQ=WEEKLY', () => {
  const ical = generateICalString({
    title: 'Weekly standup',
    startDate: '2026-05-04',
    startTime: '09:00',
    endDate: '2026-05-04',
    endTime: '09:30',
    recurrence: 'weekly',
    uid: 'test-uid-weekly',
  });
  assert.ok(ical.includes('RRULE:FREQ=WEEKLY'), 'RRULE not found');
});

test('monthly recurrence with count adds COUNT', () => {
  const ical = generateICalString({
    title: 'Sprint planning',
    startDate: '2026-05-04',
    startTime: '10:00',
    endDate: '2026-05-04',
    endTime: '11:00',
    recurrence: 'monthly',
    recurrenceCount: 6,
    uid: 'test-uid-count',
  });
  assert.ok(ical.includes('RRULE:FREQ=MONTHLY;COUNT=6'), 'RRULE with COUNT not found');
});

test('no RRULE when recurrence is none', () => {
  const ical = generateICalString({
    title: 'One-off',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    recurrence: 'none',
    uid: 'test-uid-norecur',
  });
  assert.ok(!ical.includes('RRULE'), 'RRULE should be absent');
});

// ── Line folding ───────────────────────────────────────────────────────────
test('no line in the output exceeds 75 characters', () => {
  const longTitle = 'This is a very long event title that definitely exceeds the iCal 75-character line limit set by RFC 5545';
  const ical = generateICalString({
    title: longTitle,
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    uid: 'test-uid-fold',
  });
  const lines = ical.split('\r\n').filter(Boolean);
  for (const line of lines) {
    assert.ok(line.length <= 75, `Line too long (${line.length} chars): ${line}`);
  }
});

test('output lines end with CRLF', () => {
  const ical = generateICalString({
    title: 'CRLF check',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    uid: 'test-uid-crlf',
  });
  assert.ok(ical.includes('\r\n'), 'CRLF not found');
  assert.ok(!ical.includes('\r\nBEGIN:VCALENDAR\r\n'.replace('BEGIN:VCALENDAR', '').replace('\r\n', '\n')), 'bare LF found');
});

// ── DTSTAMP is present ────────────────────────────────────────────────────
test('DTSTAMP is present', () => {
  const ical = generateICalString({
    title: 'Stamp check',
    startDate: '2026-05-01',
    startTime: '10:00',
    endDate: '2026-05-01',
    endTime: '11:00',
    uid: 'test-uid-stamp',
  });
  assert.ok(ical.includes('DTSTAMP:'), 'DTSTAMP missing');
});

// ── Validation ─────────────────────────────────────────────────────────────
test('rejects missing title', () => {
  assert.throws(() => generateICalString({
    startDate: '2026-05-01', startTime: '10:00',
    endDate: '2026-05-01', endTime: '11:00',
  }), /title/);
});

test('rejects empty title', () => {
  assert.throws(() => generateICalString({
    title: '   ',
    startDate: '2026-05-01', startTime: '10:00',
    endDate: '2026-05-01', endTime: '11:00',
  }), /title/);
});

test('rejects missing startDate', () => {
  assert.throws(() => generateICalString({
    title: 'Test',
    startTime: '10:00',
    endDate: '2026-05-01', endTime: '11:00',
  }), /startDate/);
});

test('rejects missing startTime for timed events', () => {
  assert.throws(() => generateICalString({
    title: 'Test',
    startDate: '2026-05-01',
    endDate: '2026-05-01', endTime: '11:00',
    allDay: false,
  }), /startTime/);
});

test('rejects end before start (timed)', () => {
  assert.throws(() => generateICalString({
    title: 'Test',
    startDate: '2026-05-01', startTime: '12:00',
    endDate: '2026-05-01', endTime: '10:00',
  }), /end must be on or after start/);
});

test('rejects end before start (all-day)', () => {
  assert.throws(() => generateICalString({
    title: 'Test',
    startDate: '2026-05-10',
    endDate: '2026-05-09',
    allDay: true,
  }), /end must be on or after start/);
});

test('rejects invalid date format', () => {
  assert.throws(() => generateICalString({
    title: 'Test',
    startDate: '01/05/2026', startTime: '10:00',
    endDate: '2026-05-01', endTime: '11:00',
  }), /YYYY-MM-DD/);
});
