'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateWeddingTables } = require('./wedding-table-planner.js');

test('returns all expected keys', () => {
  const r = calculateWeddingTables({ guestCount: 80 });
  for (const k of ['guestCount','tableSize','topTableGuests','guestsToSeat','tablesNeeded','totalSeats','emptySeats','alternatives']) {
    assert.ok(k in r, `missing key: ${k}`);
  }
});

test('80 guests, default table size 8: 10 tables, 0 empty seats', () => {
  const r = calculateWeddingTables({ guestCount: 80 });
  assert.equal(r.tablesNeeded, 10);
  assert.equal(r.emptySeats, 0);
  assert.equal(r.totalSeats, 80);
});

test('83 guests, table size 8: 11 tables, 5 empty seats', () => {
  const r = calculateWeddingTables({ guestCount: 83, tableSize: 8 });
  assert.equal(r.tablesNeeded, 11);
  assert.equal(r.emptySeats, 5);
  assert.equal(r.totalSeats, 88);
});

test('guestsToSeat excludes top table', () => {
  const r = calculateWeddingTables({ guestCount: 80, tableSize: 8, topTableGuests: 8 });
  assert.equal(r.guestsToSeat, 72);
  assert.equal(r.tablesNeeded, 9);
  assert.equal(r.emptySeats, 0);
});

test('table size 10: 8 tables for 80 guests', () => {
  const r = calculateWeddingTables({ guestCount: 80, tableSize: 10 });
  assert.equal(r.tablesNeeded, 8);
  assert.equal(r.emptySeats, 0);
});

test('alternatives array is populated with nearby sizes', () => {
  const r = calculateWeddingTables({ guestCount: 80, tableSize: 8 });
  assert.ok(Array.isArray(r.alternatives));
  assert.ok(r.alternatives.length > 0);
  // All alternatives should have the required keys
  for (const a of r.alternatives) {
    assert.ok('tableSize' in a && 'tablesNeeded' in a && 'emptySeats' in a);
  }
});

test('alternatives do not include the chosen table size', () => {
  const r = calculateWeddingTables({ guestCount: 80, tableSize: 8 });
  const sizes = r.alternatives.map(a => a.tableSize);
  assert.ok(!sizes.includes(8));
});

test('alternatives are clamped to valid range 4–30', () => {
  const r = calculateWeddingTables({ guestCount: 80, tableSize: 4 });
  for (const a of r.alternatives) {
    assert.ok(a.tableSize >= 4 && a.tableSize <= 30);
  }
});

test('emptySeats is always >= 0', () => {
  for (const guests of [47, 61, 83, 100]) {
    const r = calculateWeddingTables({ guestCount: guests, tableSize: 8 });
    assert.ok(r.emptySeats >= 0);
  }
});

test('totalSeats >= guestsToSeat', () => {
  const r = calculateWeddingTables({ guestCount: 77, tableSize: 10 });
  assert.ok(r.totalSeats >= r.guestsToSeat);
});

test('throws if guestCount < 2', () => {
  assert.throws(() => calculateWeddingTables({ guestCount: 1 }), /guestCount/);
});

test('throws if tableSize < 4', () => {
  assert.throws(() => calculateWeddingTables({ guestCount: 80, tableSize: 3 }), /tableSize/);
});

test('throws if tableSize > 30', () => {
  assert.throws(() => calculateWeddingTables({ guestCount: 80, tableSize: 31 }), /tableSize/);
});

test('throws if topTableGuests >= guestCount', () => {
  assert.throws(() => calculateWeddingTables({ guestCount: 80, topTableGuests: 80 }), /topTableGuests/);
});

test('throws if topTableGuests < 0', () => {
  assert.throws(() => calculateWeddingTables({ guestCount: 80, topTableGuests: -1 }), /topTableGuests/);
});
