'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('./time-zone-converter.js');

// All these tests use the IANA tzdata that ships with Node, which is the
// same tzdata each browser exposes via Intl. Behaviour should be identical.

test('parseLocalToUtc: London 12:00 in summer (BST) is 11:00 UTC', () => {
  const utc = lib.parseLocalToUtc('Europe/London', '2026-07-01', '12:00');
  assert.equal(utc.toISOString(), '2026-07-01T11:00:00.000Z');
});

test('parseLocalToUtc: London 12:00 in winter (GMT) is 12:00 UTC', () => {
  const utc = lib.parseLocalToUtc('Europe/London', '2026-01-15', '12:00');
  assert.equal(utc.toISOString(), '2026-01-15T12:00:00.000Z');
});

test('parseLocalToUtc: New York 09:00 in winter (EST, -5) is 14:00 UTC', () => {
  const utc = lib.parseLocalToUtc('America/New_York', '2026-01-15', '09:00');
  assert.equal(utc.toISOString(), '2026-01-15T14:00:00.000Z');
});

test('parseLocalToUtc: UTC source passes through unchanged', () => {
  const utc = lib.parseLocalToUtc('UTC', '2026-04-27', '14:30');
  assert.equal(utc.toISOString(), '2026-04-27T14:30:00.000Z');
});

test('formatInZone: London summer instant shows BST and UTC+1', () => {
  // 2026-07-01 11:00 UTC = 12:00 BST in London
  const inst = new Date('2026-07-01T11:00:00Z');
  const out = lib.formatInZone(inst, 'Europe/London', { hour12: false });
  assert.match(out.timeLabel, /12:00/);
  assert.match(out.dateLabel, /1 Jul 2026|Jul 2026|2026/);
  assert.equal(out.offsetLabel, 'UTC+1');
});

test('formatInZone: New York winter instant shows -5 offset', () => {
  // 2026-01-15 14:00 UTC = 09:00 EST in NY
  const inst = new Date('2026-01-15T14:00:00Z');
  const out = lib.formatInZone(inst, 'America/New_York', { hour12: false });
  assert.match(out.timeLabel, /09:00/);
  assert.equal(out.offsetLabel, 'UTC-5');
});

test('formatInZone: UTC instant in UTC zone has UTC+0 offset', () => {
  const inst = new Date('2026-04-27T14:30:00Z');
  const out = lib.formatInZone(inst, 'UTC', { hour12: false });
  assert.equal(out.offsetLabel, 'UTC+0');
  assert.match(out.timeLabel, /14:30/);
});

test('formatInZone: India shows half-hour offset UTC+5:30', () => {
  const inst = new Date('2026-04-27T00:00:00Z');
  const out = lib.formatInZone(inst, 'Asia/Kolkata', { hour12: false });
  assert.equal(out.offsetLabel, 'UTC+5:30');
  assert.match(out.timeLabel, /05:30/);
});

test('formatInZone: 24-hour vs 12-hour formatting', () => {
  const inst = new Date('2026-04-27T14:30:00Z');
  const a = lib.formatInZone(inst, 'UTC', { hour12: false });
  const b = lib.formatInZone(inst, 'UTC', { hour12: true });
  assert.match(a.timeLabel, /14:30/);
  assert.match(b.timeLabel, /2:30/);
  assert.match(b.timeLabel, /pm|PM/i);
});

test('international date line: London Tue 23:00 = Auckland Wed', () => {
  // Pick a winter date so London is GMT (UTC+0) and Auckland is NZDT (UTC+13)
  // 2026-01-13 (Tue) 23:00 GMT -> 2026-01-14 (Wed) 12:00 NZDT
  const utc = lib.parseLocalToUtc('Europe/London', '2026-01-13', '23:00');
  const out = lib.formatInZone(utc, 'Pacific/Auckland', { hour12: false });
  assert.match(out.weekdayLabel, /Wed/);
  assert.match(out.timeLabel, /12:00/);
});

test('DST spring-forward: 2026-03-29 02:30 London does not exist', () => {
  // The clock skips from 01:00 GMT to 02:00 BST on 29 Mar 2026.
  // Intl will resolve a "non-existent" wall time by either advancing or
  // staying put, depending on engine. We just check the result is a real
  // instant and that the converter does not throw.
  const utc = lib.parseLocalToUtc('Europe/London', '2026-03-29', '02:30');
  assert.ok(utc instanceof Date);
  assert.ok(!isNaN(utc.getTime()));
});

test('DST autumn-back: 2026-10-25 01:30 London is ambiguous, picks one', () => {
  const utc = lib.parseLocalToUtc('Europe/London', '2026-10-25', '01:30');
  assert.ok(utc instanceof Date);
  assert.ok(!isNaN(utc.getTime()));
});

test('same-offset family stays aligned: London and Dublin in summer', () => {
  const utc = lib.parseLocalToUtc('Europe/London', '2026-07-01', '12:00');
  const a = lib.formatInZone(utc, 'Europe/London', { hour12: false });
  const b = lib.formatInZone(utc, 'Europe/Dublin', { hour12: false });
  assert.equal(a.timeLabel, b.timeLabel);
  assert.equal(a.dateLabel, b.dateLabel);
});

test('curated zone list includes common entries', () => {
  const zones = lib.curatedZones();
  assert.ok(zones.length > 30);
  const slugs = zones.map(z => z.id);
  ['UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney', 'Asia/Kolkata'].forEach(z => {
    assert.ok(slugs.indexOf(z) !== -1, 'missing ' + z);
  });
});

test('isValidZone: accepts known IANA names', () => {
  assert.equal(lib.isValidZone('Europe/London'), true);
  assert.equal(lib.isValidZone('UTC'), true);
});

test('isValidZone: rejects nonsense', () => {
  assert.equal(lib.isValidZone('Atlantis/Lost'), false);
  assert.equal(lib.isValidZone(''), false);
  assert.equal(lib.isValidZone(null), false);
});

test('formatOffset: rounds positive whole hours', () => {
  assert.equal(lib.formatOffsetMinutes(60), 'UTC+1');
  assert.equal(lib.formatOffsetMinutes(0), 'UTC+0');
  assert.equal(lib.formatOffsetMinutes(-300), 'UTC-5');
});

test('formatOffset: handles half and quarter hours', () => {
  assert.equal(lib.formatOffsetMinutes(330), 'UTC+5:30');
  assert.equal(lib.formatOffsetMinutes(345), 'UTC+5:45');
  assert.equal(lib.formatOffsetMinutes(-210), 'UTC-3:30');
});
