'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateWeddingDayTimeline } = require('./wedding-day-timeline.js');

function milestone(result, id) {
  return result.milestones.find(m => m.id === id);
}

// ── Structure ─────────────────────────────────────────────────────────────

test('returns object with milestones array, ceremonyTime, receptionEndTime', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  assert.equal(r.ceremonyTime, '14:00');
  assert.equal(r.receptionEndTime, '23:30');
  assert.ok(Array.isArray(r.milestones));
});

test('returns at least 10 milestones', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  assert.ok(r.milestones.length >= 10, `expected >= 10, got ${r.milestones.length}`);
});

test('each milestone has id, name, time, minutesFromCeremony', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  for (const m of r.milestones) {
    assert.ok(typeof m.id === 'string' && m.id.length > 0, `missing id`);
    assert.ok(typeof m.name === 'string' && m.name.length > 0, `missing name on ${m.id}`);
    assert.ok(/^\d{2}:\d{2}$/.test(m.time), `bad time on ${m.id}: ${m.time}`);
    assert.ok(typeof m.minutesFromCeremony === 'number', `missing minutesFromCeremony on ${m.id}`);
  }
});

test('milestones are sorted in chronological order', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  for (let i = 1; i < r.milestones.length; i++) {
    assert.ok(
      r.milestones[i].minutesFromCeremony >= r.milestones[i - 1].minutesFromCeremony,
      `out of order: ${r.milestones[i - 1].id} (${r.milestones[i - 1].minutesFromCeremony}) then ${r.milestones[i].id} (${r.milestones[i].minutesFromCeremony})`
    );
  }
});

// ── Specific milestone times ───────────────────────────────────────────────

test('bridal prep starts 4 hours (240 min) before ceremony', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'bridal-prep');
  assert.ok(m, 'bridal-prep not found');
  assert.equal(m.minutesFromCeremony, -240);
  assert.equal(m.time, '10:00');
});

test('ceremony-start milestone is at ceremonyTime', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'ceremony-start');
  assert.ok(m, 'ceremony-start not found');
  assert.equal(m.minutesFromCeremony, 0);
  assert.equal(m.time, '14:00');
});

test('ceremony ends 45 minutes after start', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'ceremony-end');
  assert.ok(m, 'ceremony-end not found');
  assert.equal(m.minutesFromCeremony, 45);
  assert.equal(m.time, '14:45');
});

test('guests arrive 30 minutes before ceremony', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'guests-arrive');
  assert.ok(m, 'guests-arrive not found');
  assert.equal(m.minutesFromCeremony, -30);
  assert.equal(m.time, '13:30');
});

test('first dance is 90 minutes before receptionEndTime', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'first-dance');
  assert.ok(m, 'first-dance not found');
  // 23:30 = 1410 min; 1410 - 90 = 1320 = 22:00
  assert.equal(m.time, '22:00');
});

test('last song is 10 minutes before receptionEndTime', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'last-song');
  assert.ok(m, 'last-song not found');
  // 23:30 - 10 min = 23:20
  assert.equal(m.time, '23:20');
});

test('carriages / end milestone is at receptionEndTime', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  const m = milestone(r, 'carriages');
  assert.ok(m, 'carriages not found');
  assert.equal(m.time, '23:30');
});

// ── Different ceremony times ──────────────────────────────────────────────

test('works with morning ceremony', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '11:00', receptionEndTime: '22:00' });
  const prep = milestone(r, 'bridal-prep');
  assert.equal(prep.time, '07:00');
  const ceremony = milestone(r, 'ceremony-start');
  assert.equal(ceremony.time, '11:00');
});

test('all milestone times are valid HH:MM strings', () => {
  const r = calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '23:30' });
  for (const m of r.milestones) {
    assert.ok(/^\d{2}:\d{2}$/.test(m.time), `invalid time on ${m.id}: ${m.time}`);
  }
});

// ── Validation ────────────────────────────────────────────────────────────

test('rejects missing ceremonyTime', () => {
  assert.throws(() => calculateWeddingDayTimeline({ receptionEndTime: '23:30' }), /ceremonyTime/);
});

test('rejects invalid ceremonyTime', () => {
  assert.throws(() => calculateWeddingDayTimeline({ ceremonyTime: '25:00', receptionEndTime: '23:30' }), /ceremonyTime/);
});

test('rejects missing receptionEndTime', () => {
  assert.throws(() => calculateWeddingDayTimeline({ ceremonyTime: '14:00' }), /receptionEndTime/);
});

test('rejects receptionEndTime less than 4 hours after ceremony', () => {
  assert.throws(
    () => calculateWeddingDayTimeline({ ceremonyTime: '14:00', receptionEndTime: '17:30' }),
    /receptionEndTime/
  );
});
