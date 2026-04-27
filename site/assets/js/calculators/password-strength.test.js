'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const lib = require('./password-strength.js');

test('classifyChars detects all four classes', () => {
  const c = lib.classifyChars('Aa1!');
  assert.equal(c.lower, true);
  assert.equal(c.upper, true);
  assert.equal(c.digit, true);
  assert.equal(c.symbol, true);
});

test('charsetSize is 26 for lowercase only', () => {
  assert.equal(lib.charsetSize(lib.classifyChars('abc')), 26);
});

test('charsetSize is 95 for full mix', () => {
  assert.equal(lib.charsetSize(lib.classifyChars('Aa1!')), 95);
});

test('empty password has zero entropy', () => {
  assert.equal(lib.rawEntropyBits(''), 0);
});

test('entropy increases with length', () => {
  const short = lib.rawEntropyBits('abcdef');
  const long  = lib.rawEntropyBits('abcdefghij');
  assert.ok(long > short, 'longer password should have higher entropy');
});

test('entropy increases with character variety at same length', () => {
  const a = lib.rawEntropyBits('abcdefgh');
  const b = lib.rawEntropyBits('Abcdefg1');
  assert.ok(b > a, 'mixed-class should beat single-class at same length');
});

test('"password" gets Very Weak rating and breach-list flag', () => {
  const r = lib.assess('password');
  assert.equal(r.rating.label, 'Very Weak');
  assert.equal(r.inCommonList, true);
  assert.ok(r.issues.some(i => i.code === 'common'));
});

test('"123456" gets Very Weak and breach-list flag', () => {
  const r = lib.assess('123456');
  assert.equal(r.rating.label, 'Very Weak');
  assert.equal(r.inCommonList, true);
});

test('long random mixed string gets Strong or Very Strong', () => {
  const r = lib.assess('xK7$pQ2!mN9@vR3#wL5');
  assert.ok(r.rating.level >= 4, 'expected Strong or Very Strong, got ' + r.rating.label);
});

test('crack times for very weak password come out as "instantly"', () => {
  const r = lib.assess('password');
  assert.equal(r.crackTimes.onlineThrottled, 'instantly');
});

test('crack times for very strong password are long', () => {
  const r = lib.assess('xK7$pQ2!mN9@vR3#wL5tH8&yJ4');
  assert.notEqual(r.crackTimes.offlineFast, 'instantly');
});

test('humanDuration formats sensible bands', () => {
  assert.equal(lib.humanDuration(0.5), 'instantly');
  assert.equal(lib.humanDuration(30), '30 seconds');
  assert.match(lib.humanDuration(120), /minutes/);
  assert.match(lib.humanDuration(7200), /hours/);
  assert.match(lib.humanDuration(86400 * 5), /days/);
  assert.match(lib.humanDuration(86400 * 365 * 5), /years/);
});

test('keyboard-run penalty applied to "qwerty1234"', () => {
  const issues = lib.findIssues('qwerty1234');
  assert.ok(issues.some(i => i.code === 'keyboard-run'));
});

test('repeated-character penalty applied to "aaaa1234"', () => {
  const issues = lib.findIssues('aaaa1234');
  assert.ok(issues.some(i => i.code === 'repeats'));
});

test('year-shaped number penalty applied', () => {
  const issues = lib.findIssues('summer2023fun');
  assert.ok(issues.some(i => i.code === 'year'));
});

test('dictionary stem penalty applied', () => {
  const issues = lib.findIssues('mydragonpassword');
  assert.ok(issues.some(i => i.code === 'dictionary'));
});

test('one-class penalty applied to all-lower', () => {
  const issues = lib.findIssues('mnbvcxzlkjhgfds');
  assert.ok(issues.some(i => i.code === 'one-class'));
});

test('strong long passphrase gets no major issues', () => {
  const issues = lib.findIssues('Bx7!qP2#mZ9$Lk4&Wn');
  assert.equal(issues.length, 0);
});

test('rating thresholds map cleanly', () => {
  assert.equal(lib.rate(20).label, 'Very Weak');
  assert.equal(lib.rate(30).label, 'Weak');
  assert.equal(lib.rate(50).label, 'Fair');
  assert.equal(lib.rate(70).label, 'Strong');
  assert.equal(lib.rate(100).label, 'Very Strong');
});

test('assess returns three threat-model crack times', () => {
  const r = lib.assess('Bx7!qP2#mZ9$Lk4&Wn');
  assert.ok(r.crackTimes.onlineThrottled);
  assert.ok(r.crackTimes.onlineUnthrottled);
  assert.ok(r.crackTimes.offlineFast);
});

test('common-password penalty zeros adjusted entropy', () => {
  const r = lib.assess('letmein');
  assert.equal(r.adjustedEntropyBits, 0);
});
