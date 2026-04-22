'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { calculateMargin, calculatePriceFromMargin, calculatePriceFromMarkup } = require('./profit-margin.js');

// --- calculateMargin ---

test('calculateMargin: basic gross margin — £1000 revenue, £600 cogs → 40% margin, 66.67% markup', () => {
  const r = calculateMargin({ revenue: 1000, cogs: 600 });
  assert.equal(r.grossProfit, 400);
  assert.equal(r.grossMarginPct, 40);
  assert.equal(r.markupPct, 66.67);
  assert.equal(r.netProfit, 400);
  assert.equal(r.netMarginPct, 40);
  assert.equal(r.hasOperatingExpenses, false);
});

test('calculateMargin: with operating expenses — £1000 revenue, £600 cogs, £200 opex → net margin 20%', () => {
  const r = calculateMargin({ revenue: 1000, cogs: 600, operatingExpenses: 200 });
  assert.equal(r.grossProfit, 400);
  assert.equal(r.grossMarginPct, 40);
  assert.equal(r.netProfit, 200);
  assert.equal(r.netMarginPct, 20);
  assert.equal(r.hasOperatingExpenses, true);
});

test('calculateMargin: zero cogs → 100% margin, null markup', () => {
  const r = calculateMargin({ revenue: 500, cogs: 0 });
  assert.equal(r.grossMarginPct, 100);
  assert.equal(r.markupPct, null);
});

test('calculateMargin: loss-making — cogs > revenue → negative margin', () => {
  const r = calculateMargin({ revenue: 500, cogs: 700 });
  assert.equal(r.grossProfit, -200);
  assert.equal(r.grossMarginPct, -40);
  assert.ok(r.markupPct < 0);
});

test('calculateMargin: operating expenses larger than gross profit → negative net margin', () => {
  const r = calculateMargin({ revenue: 1000, cogs: 600, operatingExpenses: 500 });
  assert.equal(r.netProfit, -100);
  assert.equal(r.netMarginPct, -10);
});

test('calculateMargin: throws on non-positive revenue', () => {
  assert.throws(() => calculateMargin({ revenue: 0, cogs: 100 }), /revenue/);
  assert.throws(() => calculateMargin({ revenue: -50, cogs: 100 }), /revenue/);
});

test('calculateMargin: throws on negative cogs', () => {
  assert.throws(() => calculateMargin({ revenue: 1000, cogs: -1 }), /cogs/);
});

test('calculateMargin: omitted operatingExpenses defaults to zero', () => {
  const r = calculateMargin({ revenue: 200, cogs: 100 });
  assert.equal(r.operatingExpenses, 0);
  assert.equal(r.hasOperatingExpenses, false);
});

// --- calculatePriceFromMargin ---

test('calculatePriceFromMargin: 50% target margin on £100 cost → £200 price', () => {
  const r = calculatePriceFromMargin({ cost: 100, targetMarginPct: 50 });
  assert.equal(r.price, 200);
  assert.equal(r.profit, 100);
  assert.equal(r.markupPct, 100);
});

test('calculatePriceFromMargin: 20% target margin on £80 cost → £100 price', () => {
  const r = calculatePriceFromMargin({ cost: 80, targetMarginPct: 20 });
  assert.equal(r.price, 100);
  assert.equal(r.profit, 20);
  assert.equal(r.markupPct, 25);
});

test('calculatePriceFromMargin: 40% margin on £60 cost', () => {
  const r = calculatePriceFromMargin({ cost: 60, targetMarginPct: 40 });
  assert.equal(r.price, 100);
  assert.equal(r.profit, 40);
});

test('calculatePriceFromMargin: throws on margin <= 0', () => {
  assert.throws(() => calculatePriceFromMargin({ cost: 100, targetMarginPct: 0 }), /targetMarginPct/);
  assert.throws(() => calculatePriceFromMargin({ cost: 100, targetMarginPct: -10 }), /targetMarginPct/);
});

test('calculatePriceFromMargin: throws on margin >= 100', () => {
  assert.throws(() => calculatePriceFromMargin({ cost: 100, targetMarginPct: 100 }), /targetMarginPct/);
  assert.throws(() => calculatePriceFromMargin({ cost: 100, targetMarginPct: 110 }), /targetMarginPct/);
});

test('calculatePriceFromMargin: throws on non-positive cost', () => {
  assert.throws(() => calculatePriceFromMargin({ cost: 0, targetMarginPct: 30 }), /cost/);
  assert.throws(() => calculatePriceFromMargin({ cost: -5, targetMarginPct: 30 }), /cost/);
});

// --- calculatePriceFromMarkup ---

test('calculatePriceFromMarkup: 100% markup on £100 cost → £200 price, 50% margin', () => {
  const r = calculatePriceFromMarkup({ cost: 100, targetMarkupPct: 100 });
  assert.equal(r.price, 200);
  assert.equal(r.profit, 100);
  assert.equal(r.marginPct, 50);
});

test('calculatePriceFromMarkup: 25% markup on £80 cost → £100 price, 20% margin', () => {
  const r = calculatePriceFromMarkup({ cost: 80, targetMarkupPct: 25 });
  assert.equal(r.price, 100);
  assert.equal(r.profit, 20);
  assert.equal(r.marginPct, 20);
});

test('calculatePriceFromMarkup: 50% markup on £200 cost → £300 price', () => {
  const r = calculatePriceFromMarkup({ cost: 200, targetMarkupPct: 50 });
  assert.equal(r.price, 300);
  assert.equal(r.profit, 100);
});

test('calculatePriceFromMarkup: throws on non-positive markup', () => {
  assert.throws(() => calculatePriceFromMarkup({ cost: 100, targetMarkupPct: 0 }), /targetMarkupPct/);
  assert.throws(() => calculatePriceFromMarkup({ cost: 100, targetMarkupPct: -5 }), /targetMarkupPct/);
});

test('calculatePriceFromMarkup: throws on non-positive cost', () => {
  assert.throws(() => calculatePriceFromMarkup({ cost: 0, targetMarkupPct: 50 }), /cost/);
});
