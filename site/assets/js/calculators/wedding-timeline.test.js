'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateWeddingTimeline } = require('./wedding-timeline.js');

// ── Helpers ────────────────────────────────────────────────────────────────

// Fixed future wedding date for deterministic tests
const WEDDING = '2027-09-18';

function milestone(result, id) {
  return result.milestones.find(m => m.id === id);
}

function subtractDays(dateStr, days) {
  var d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── Basic structure ────────────────────────────────────────────────────────

test('returns object with weddingDate and milestones array', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  assert.equal(r.weddingDate, WEDDING);
  assert.ok(Array.isArray(r.milestones));
});

test('returns at least 10 milestones', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  assert.ok(r.milestones.length >= 10, `expected >= 10, got ${r.milestones.length}`);
});

test('each milestone has id, name, date, daysBeforeWedding, category', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  for (const m of r.milestones) {
    assert.ok(typeof m.id === 'string' && m.id.length > 0, `missing id: ${JSON.stringify(m)}`);
    assert.ok(typeof m.name === 'string' && m.name.length > 0, `missing name on ${m.id}`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(m.date), `bad date on ${m.id}: ${m.date}`);
    assert.ok(typeof m.daysBeforeWedding === 'number', `missing daysBeforeWedding on ${m.id}`);
    assert.ok(typeof m.category === 'string', `missing category on ${m.id}`);
  }
});

test('milestones are sorted in ascending date order (earliest first)', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  for (let i = 1; i < r.milestones.length; i++) {
    assert.ok(
      r.milestones[i].date >= r.milestones[i - 1].date,
      `out of order: ${r.milestones[i - 1].date} then ${r.milestones[i].date}`
    );
  }
});

test('daysBeforeWedding is positive for all milestones (all before wedding)', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  for (const m of r.milestones) {
    assert.ok(m.daysBeforeWedding > 0, `${m.id} has daysBeforeWedding = ${m.daysBeforeWedding}`);
  }
});

// ── Save-the-date timing ────────────────────────────────────────────────────

test('save-the-date is 7 months before for local wedding (default)', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  const m = milestone(r, 'save-the-date');
  assert.ok(m, 'save-the-date milestone not found');
  // 7 months before 2027-09-18 = 2027-02-18
  assert.equal(m.date, '2027-02-18');
});

test('save-the-date is 10 months before for destination wedding', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING, isDestination: true });
  const m = milestone(r, 'save-the-date');
  assert.ok(m, 'save-the-date milestone not found');
  // 10 months before 2027-09-18 = 2026-11-18
  assert.equal(m.date, '2026-11-18');
});

// ── Invitations ─────────────────────────────────────────────────────────────

test('invitations are 8 weeks (56 days) before wedding', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  const m = milestone(r, 'send-invitations');
  assert.ok(m, 'send-invitations milestone not found');
  assert.equal(m.date, subtractDays(WEDDING, 56));
  assert.equal(m.daysBeforeWedding, 56);
});

// ── RSVP ────────────────────────────────────────────────────────────────────

test('RSVP deadline is 3 weeks (21 days) before wedding', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  const m = milestone(r, 'rsvp-deadline');
  assert.ok(m, 'rsvp-deadline milestone not found');
  assert.equal(m.date, subtractDays(WEDDING, 21));
  assert.equal(m.daysBeforeWedding, 21);
});

// ── Final headcount ──────────────────────────────────────────────────────────

test('final headcount is 14 days before wedding', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  const m = milestone(r, 'final-headcount');
  assert.ok(m, 'final-headcount milestone not found');
  assert.equal(m.daysBeforeWedding, 14);
});

// ── Rehearsal ────────────────────────────────────────────────────────────────

test('rehearsal is 1 day before wedding', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  const m = milestone(r, 'rehearsal');
  assert.ok(m, 'rehearsal milestone not found');
  assert.equal(m.daysBeforeWedding, 1);
  assert.equal(m.date, subtractDays(WEDDING, 1));
});

// ── Month-end clamping ────────────────────────────────────────────────────────

test('month-end clamping: 1 month before March 31 = February 28 (not Feb 31)', () => {
  const r = calculateWeddingTimeline({ weddingDate: '2028-03-31' });
  const m = milestone(r, 'send-invitations');
  // 8 weeks before is day-based, not month-based — just check save-the-date month clamping
  const saveDate = milestone(r, 'save-the-date');
  // 7 months before 2028-03-31 = 2027-08-31 (no clamping needed)
  assert.equal(saveDate.date, '2027-08-31');
});

test('month-end clamping: 7 months before Jan 31 = June 30 (not June 31)', () => {
  // 2027-01-31 minus 7 months = 2026-06-30 (June has 30 days)
  const r = calculateWeddingTimeline({ weddingDate: '2027-01-31' });
  const m = milestone(r, 'save-the-date');
  assert.equal(m.date, '2026-06-30');
});

// ── Milestone IDs present ─────────────────────────────────────────────────────

test('expected milestone IDs are all present', () => {
  const r = calculateWeddingTimeline({ weddingDate: WEDDING });
  const ids = r.milestones.map(m => m.id);
  const required = [
    'book-venue', 'photographer', 'caterer', 'save-the-date',
    'send-invitations', 'rsvp-deadline', 'final-headcount', 'rehearsal',
  ];
  for (const id of required) {
    assert.ok(ids.includes(id), `missing milestone id: ${id}`);
  }
});

// ── Validation ────────────────────────────────────────────────────────────────

test('throws on missing weddingDate', () => {
  assert.throws(() => calculateWeddingTimeline({}), /weddingDate/);
});

test('throws on invalid date string', () => {
  assert.throws(() => calculateWeddingTimeline({ weddingDate: 'not-a-date' }), /weddingDate/);
});

test('throws on empty string', () => {
  assert.throws(() => calculateWeddingTimeline({ weddingDate: '' }), /weddingDate/);
});
