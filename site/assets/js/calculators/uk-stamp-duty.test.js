'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateSDLT, FTB_MAX_PRICE, ADDITIONAL_SURCHARGE } = require('./uk-stamp-duty.js');

// --- Standard residential ---

test('standard: £125k → £0 (nil-rate band only)', () => {
  const r = calculateSDLT({ purchasePrice: 125000, buyerType: 'standard' });
  assert.equal(r.totalTax, 0);
  assert.equal(r.effectiveRate, 0);
});

test('standard: £250k → £2,500 (0% on first £125k, 2% on next £125k)', () => {
  const r = calculateSDLT({ purchasePrice: 250000, buyerType: 'standard' });
  // 0% × 125000 = 0; 2% × 125000 = 2500
  assert.equal(r.totalTax, 2500);
});

test('standard: £300k → £5,000', () => {
  // 0% × 125k = 0; 2% × 125k = 2500; 5% × 50k = 2500 → total 5000
  const r = calculateSDLT({ purchasePrice: 300000, buyerType: 'standard' });
  assert.equal(r.totalTax, 5000);
});

test('standard: £500k → £15,000', () => {
  // 0% × 125k = 0; 2% × 125k = 2500; 5% × 250k = 12500 → total 15000
  const r = calculateSDLT({ purchasePrice: 500000, buyerType: 'standard' });
  assert.equal(r.totalTax, 15000);
});

test('standard: £925k → £36,250', () => {
  // 0% × 125k = 0; 2% × 125k = 2500; 5% × 675k = 33750 → total 36250
  const r = calculateSDLT({ purchasePrice: 925000, buyerType: 'standard' });
  assert.equal(r.totalTax, 36250);
});

test('standard: £1,000,000 → £43,750', () => {
  // 0%×125k=0; 2%×125k=2500; 5%×675k=33750; 10%×75k=7500 → total 43750
  const r = calculateSDLT({ purchasePrice: 1000000, buyerType: 'standard' });
  assert.equal(r.totalTax, 43750);
});

test('standard: £1,500,000 → £93,750', () => {
  // 0%×125k=0; 2%×125k=2500; 5%×675k=33750; 10%×575k=57500 → total 93750
  const r = calculateSDLT({ purchasePrice: 1500000, buyerType: 'standard' });
  assert.equal(r.totalTax, 93750);
});

test('standard: effective rate is totalTax / price × 100', () => {
  const r = calculateSDLT({ purchasePrice: 300000, buyerType: 'standard' });
  assert.equal(r.effectiveRate, Math.round(5000 / 300000 * 10000) / 100);
});

test('standard: breakdown sums to totalTax', () => {
  const r = calculateSDLT({ purchasePrice: 500000, buyerType: 'standard' });
  const sum = r.breakdown.reduce((s, b) => s + b.tax, 0);
  assert.ok(Math.abs(sum - r.totalTax) < 0.01);
});

// --- First-time buyer ---

test('FTB: £300k → £0 (full nil-rate relief)', () => {
  const r = calculateSDLT({ purchasePrice: 300000, buyerType: 'first_time_buyer' });
  assert.equal(r.totalTax, 0);
  assert.equal(r.ftbRelief, true);
  assert.equal(r.ftbEligible, true);
});

test('FTB: £400k → £5,000 (0% on £300k, 5% on £100k)', () => {
  const r = calculateSDLT({ purchasePrice: 400000, buyerType: 'first_time_buyer' });
  assert.equal(r.totalTax, 5000);
  assert.equal(r.ftbRelief, true);
});

test('FTB: £500k → £10,000 (0% on £300k, 5% on £200k)', () => {
  const r = calculateSDLT({ purchasePrice: 500000, buyerType: 'first_time_buyer' });
  assert.equal(r.totalTax, 10000);
  assert.equal(r.ftbEligible, true);
});

test('FTB: price above £500k — no relief, standard rates apply', () => {
  const r = calculateSDLT({ purchasePrice: 600000, buyerType: 'first_time_buyer' });
  // Standard: 0%×125k=0; 2%×125k=2500; 5%×350k=17500 → 20000
  assert.equal(r.totalTax, 20000);
  assert.equal(r.ftbRelief, false);
  assert.equal(r.ftbEligible, false);
});

test('FTB_MAX_PRICE is £500,000', () => {
  assert.equal(FTB_MAX_PRICE, 500000);
});

// --- Additional / second home ---

test('additional: £300k → standard + 5% surcharge on all bands', () => {
  // Standard on £300k: 5000
  // Surcharge: 5% × 300k = 15000
  const r = calculateSDLT({ purchasePrice: 300000, buyerType: 'additional' });
  assert.equal(r.totalTax, 5000 + 15000);
  assert.equal(r.surchargeRate, ADDITIONAL_SURCHARGE);
  assert.equal(r.surchargeAmount, 15000);
});

test('additional: £500k → standard + 5% on £500k', () => {
  // Standard: 15000; surcharge: 5%×500k = 25000 → total 40000
  const r = calculateSDLT({ purchasePrice: 500000, buyerType: 'additional' });
  assert.equal(r.totalTax, 40000);
});

test('ADDITIONAL_SURCHARGE is 0.05', () => {
  assert.equal(ADDITIONAL_SURCHARGE, 0.05);
});

// --- Edge cases and validation ---

test('zero tax for £1 purchase (standard, within nil-rate band)', () => {
  const r = calculateSDLT({ purchasePrice: 1, buyerType: 'standard' });
  assert.equal(r.totalTax, 0);
});

test('throws on non-positive price', () => {
  assert.throws(() => calculateSDLT({ purchasePrice: 0, buyerType: 'standard' }), /purchasePrice/);
  assert.throws(() => calculateSDLT({ purchasePrice: -1, buyerType: 'standard' }), /purchasePrice/);
});

test('throws on invalid buyerType', () => {
  assert.throws(() => calculateSDLT({ purchasePrice: 300000, buyerType: 'investor' }), /buyerType/);
});

test('result includes taxYear', () => {
  const r = calculateSDLT({ purchasePrice: 300000, buyerType: 'standard' });
  assert.ok(r.taxYear);
});
