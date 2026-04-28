'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  daysBetween,
  bandFor,
  recommendedRenewalDate,
  extractNotAfter,
  parseExpiryInput,
  assess,
} = require('./ssl-certificate-expiry-calculator.js');

// --- daysBetween ---------------------------------------------------------

test('daysBetween: 30 days from today returns 30', () => {
  var today = new Date('2026-04-28T12:00:00Z');
  var future = new Date('2026-05-28T12:00:00Z');
  assert.equal(daysBetween(today, future), 30);
});

test('daysBetween: same instant returns 0', () => {
  var d = new Date('2026-04-28T12:00:00Z');
  assert.equal(daysBetween(d, d), 0);
});

test('daysBetween: expired (past) date returns negative', () => {
  var today = new Date('2026-04-28T12:00:00Z');
  var past = new Date('2026-04-18T12:00:00Z');
  assert.equal(daysBetween(today, past), -10);
});

test('daysBetween: 90 days out returns 90', () => {
  var today = new Date('2026-01-01T00:00:00Z');
  var future = new Date('2026-04-01T00:00:00Z');
  assert.equal(daysBetween(today, future), 90);
});

// --- bandFor -------------------------------------------------------------

test('bandFor: negative days remaining is Expired', () => {
  assert.equal(bandFor(-1).id, 'expired');
  assert.equal(bandFor(-30).id, 'expired');
});

test('bandFor: 0 to 7 days is Critical', () => {
  assert.equal(bandFor(0).id, 'critical');
  assert.equal(bandFor(7).id, 'critical');
});

test('bandFor: 8 to 30 days is Warning', () => {
  assert.equal(bandFor(8).id, 'warning');
  assert.equal(bandFor(30).id, 'warning');
});

test('bandFor: 31 to 60 days is Caution', () => {
  assert.equal(bandFor(31).id, 'caution');
  assert.equal(bandFor(60).id, 'caution');
});

test('bandFor: more than 60 days is Healthy', () => {
  assert.equal(bandFor(61).id, 'healthy');
  assert.equal(bandFor(365).id, 'healthy');
});

test('bandFor: each band has a label and a message', () => {
  var ids = ['expired', 'critical', 'warning', 'caution', 'healthy'];
  var samples = [-5, 3, 20, 45, 120];
  for (var i = 0; i < samples.length; i++) {
    var b = bandFor(samples[i]);
    assert.equal(b.id, ids[i]);
    assert.equal(typeof b.label, 'string');
    assert.equal(b.label.length > 0, true);
    assert.equal(typeof b.message, 'string');
    assert.equal(b.message.length > 0, true);
  }
});

// --- recommendedRenewalDate ----------------------------------------------

test('recommendedRenewalDate: default 30-day lead time subtracts 30 days', () => {
  var expiry = new Date('2026-06-01T00:00:00Z');
  var rec = recommendedRenewalDate(expiry, 30);
  assert.equal(rec.toISOString().slice(0, 10), '2026-05-02');
});

test('recommendedRenewalDate: 14-day lead time subtracts 14 days', () => {
  var expiry = new Date('2026-06-01T00:00:00Z');
  var rec = recommendedRenewalDate(expiry, 14);
  assert.equal(rec.toISOString().slice(0, 10), '2026-05-18');
});

test('recommendedRenewalDate: 0 lead time returns the expiry itself', () => {
  var expiry = new Date('2026-06-01T00:00:00Z');
  var rec = recommendedRenewalDate(expiry, 0);
  assert.equal(rec.toISOString().slice(0, 10), '2026-06-01');
});

// --- extractNotAfter -----------------------------------------------------

test('extractNotAfter: pulls the date from a standard openssl text dump', () => {
  var pem = [
    'Certificate:',
    '    Data:',
    '        Validity',
    '            Not Before: Apr 28 12:00:00 2025 GMT',
    '            Not After : Apr 28 12:00:00 2026 GMT',
    '-----BEGIN CERTIFICATE-----',
    'MIIB...',
    '-----END CERTIFICATE-----'
  ].join('\n');
  var d = extractNotAfter(pem);
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), '2026-04-28T12:00:00.000Z');
});

test('extractNotAfter: handles single-digit day padding', () => {
  var pem = '            Not After : Jan  5 09:30:00 2027 GMT';
  var d = extractNotAfter(pem);
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), '2027-01-05T09:30:00.000Z');
});

test('extractNotAfter: returns null when no Not After line is present', () => {
  assert.equal(extractNotAfter('not a certificate'), null);
  assert.equal(extractNotAfter(''), null);
});

// --- parseExpiryInput ----------------------------------------------------

test('parseExpiryInput: parses YYYY-MM-DD as UTC midnight', () => {
  var d = parseExpiryInput('2026-04-28');
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString().slice(0, 10), '2026-04-28');
});

test('parseExpiryInput: parses full ISO with time', () => {
  var d = parseExpiryInput('2026-04-28T12:00:00Z');
  assert.equal(d.toISOString(), '2026-04-28T12:00:00.000Z');
});

test('parseExpiryInput: rejects nonsense', () => {
  assert.equal(parseExpiryInput('not a date'), null);
  assert.equal(parseExpiryInput(''), null);
});

// --- assess (top-level) --------------------------------------------------

test('assess: end-to-end, 30 days remaining, 30-day lead time gives renewal today', () => {
  var today = new Date('2026-04-28T00:00:00Z');
  var expiry = new Date('2026-05-28T00:00:00Z');
  var r = assess(expiry, { now: today, leadDays: 30 });
  assert.equal(r.daysRemaining, 30);
  assert.equal(r.band.id, 'warning');
  assert.equal(r.recommendedRenewal.toISOString().slice(0, 10), '2026-04-28');
});

test('assess: expired cert flags as expired with negative days', () => {
  var today = new Date('2026-04-28T00:00:00Z');
  var expiry = new Date('2026-04-20T00:00:00Z');
  var r = assess(expiry, { now: today, leadDays: 30 });
  assert.equal(r.daysRemaining, -8);
  assert.equal(r.band.id, 'expired');
});
