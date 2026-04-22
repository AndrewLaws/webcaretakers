'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateWeddingAnniversary } = require('./wedding-anniversary.js');

// Fixed reference date: 2026-04-21 (today in this project)
const REF = '2026-04-21';

test('returns all expected keys', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-06-20', referenceDate: REF });
  for (const k of ['weddingDate','anniversaryYear','traditional','modern','nextAnniversaryYear','daysUntilNextAnniversary','isAnniversaryToday','upcomingMilestones']) {
    assert.ok(k in r, `missing key: ${k}`);
  }
});

test('2015-04-21 is the 11th anniversary on 2026-04-21', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  assert.equal(r.anniversaryYear, 11);
});

test('isAnniversaryToday is true when reference matches anniversary', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  assert.equal(r.isAnniversaryToday, true);
});

test('traditional gift for year 11 is Steel', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  assert.equal(r.traditional, 'Steel');
});

test('modern gift for year 11 is Fashion jewellery', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  assert.equal(r.modern, 'Fashion jewellery');
});

test('nextAnniversaryYear is 12 when current year is 11', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  assert.equal(r.nextAnniversaryYear, 12);
});

test('anniversary in the future this year: completed years is one less', () => {
  // Wedding 2015-04-22: 11th anniversary is tomorrow (2026-04-22), so only 10 completed
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-22', referenceDate: REF });
  assert.equal(r.anniversaryYear, 10);
  assert.equal(r.isAnniversaryToday, false);
});

test('anniversary already passed this year: completed years is correct', () => {
  // Wedding 2015-04-20: 11th anniversary was yesterday (2026-04-20), 11 completed
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-20', referenceDate: REF });
  assert.equal(r.anniversaryYear, 11);
  assert.equal(r.isAnniversaryToday, false);
});

test('traditional for year 5 is Wood', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2020-09-01', referenceDate: REF });
  // 2020 to 2026: 5 years completed (anniversary Sept 2026 is in the future)
  assert.equal(r.anniversaryYear, 5);
  assert.equal(r.traditional, 'Wood');
});

test('traditional for year 25 is Silver', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2000-04-21', referenceDate: REF });
  assert.equal(r.anniversaryYear, 26);
});

test('returns null traditional for non-milestone year (e.g. year 16)', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2010-01-01', referenceDate: REF });
  assert.equal(r.anniversaryYear, 16);
  assert.equal(r.traditional, null);
});

test('upcomingMilestones is an array of up to 5 entries', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  assert.ok(Array.isArray(r.upcomingMilestones));
  assert.ok(r.upcomingMilestones.length > 0 && r.upcomingMilestones.length <= 5);
});

test('upcomingMilestones all have year > anniversaryYear', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  for (const m of r.upcomingMilestones) {
    assert.ok(m.year > r.anniversaryYear);
  }
});

test('upcomingMilestones includes year 15 (Crystal) for 11th anniversary', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  const m15 = r.upcomingMilestones.find(m => m.year === 15);
  assert.ok(m15, 'milestone year 15 not found');
  assert.equal(m15.traditional, 'Crystal');
});

test('daysUntilNextAnniversary is 365 when today is the anniversary', () => {
  const r = calculateWeddingAnniversary({ weddingDate: '2015-04-21', referenceDate: REF });
  // 2027 is not a leap year, so 365 days
  assert.equal(r.daysUntilNextAnniversary, 365);
});

test('throws on invalid date format', () => {
  assert.throws(() => calculateWeddingAnniversary({ weddingDate: '21-04-2015', referenceDate: REF }), /weddingDate/);
});

test('throws if weddingDate is in the future', () => {
  assert.throws(() => calculateWeddingAnniversary({ weddingDate: '2027-01-01', referenceDate: REF }), /past/);
});

test('throws if weddingDate is same as reference date', () => {
  assert.throws(() => calculateWeddingAnniversary({ weddingDate: REF, referenceDate: REF }), /past/);
});
