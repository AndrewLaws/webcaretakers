'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const {
  calculateMoveCost,
  calculateStampDuty,
  CONTINGENCY,
  CONVEYANCING_BUY,
  EPC_RANGE,
} = require('./uk-house-move-cost.js');

// ---------- Stamp duty edge cases (England & NI) ----------

test('FTB £290k in England → £0 SDLT', () => {
  const r = calculateStampDuty({ propertyPrice: 290000, country: 'england_ni', buyerStatus: 'first_time' });
  assert.equal(r.taxName, 'SDLT');
  assert.equal(r.ftbApplied, true);
  assert.equal(r.total, 0);
});

test('FTB £450k in England → £7,500 SDLT (5% on £150k)', () => {
  const r = calculateStampDuty({ propertyPrice: 450000, country: 'england_ni', buyerStatus: 'first_time' });
  assert.equal(r.ftbApplied, true);
  assert.equal(r.total, 7500);
});

test('Standard buyer £600k in England → £20,000 SDLT', () => {
  // 0% × 125k = 0; 2% × 125k = 2,500; 5% × 350k = 17,500 → 20,000
  const r = calculateStampDuty({ propertyPrice: 600000, country: 'england_ni', buyerStatus: 'home_mover' });
  assert.equal(r.total, 20000);
});

test('FTB above £500k → no relief, standard rates', () => {
  const r = calculateStampDuty({ propertyPrice: 600000, country: 'england_ni', buyerStatus: 'first_time' });
  assert.equal(r.ftbApplied, false);
  assert.equal(r.total, 20000);
});

test('Additional property £500k in England → standard £15,000 + 5% surcharge on full £500k = £40,000', () => {
  const r = calculateStampDuty({ propertyPrice: 500000, country: 'england_ni', buyerStatus: 'additional' });
  assert.equal(r.surcharge, 0.05);
  assert.equal(r.surchargeAmount, 25000);
  assert.equal(r.total, 40000);
});

// ---------- Scotland LBTT ----------

test('Scotland buyer £400k → LBTT band calc (home mover)', () => {
  // 0% × 145k = 0; 2% × 105k = 2,100; 5% × 75k = 3,750; 10% × 75k = 7,500 → 13,350
  const r = calculateStampDuty({ propertyPrice: 400000, country: 'scotland', buyerStatus: 'home_mover' });
  assert.equal(r.taxName, 'LBTT');
  assert.equal(r.total, 13350);
});

test('Scotland FTB at £200k → relief lifts nil-rate to £175k, then 2% on £25k = £500', () => {
  const r = calculateStampDuty({ propertyPrice: 200000, country: 'scotland', buyerStatus: 'first_time' });
  assert.equal(r.ftbApplied, true);
  assert.equal(r.total, 500);
});

test('Scotland additional £300k → adds 8% ADS', () => {
  // Base: 0% × 145k = 0; 2% × 105k = 2,100; 5% × 50k = 2,500 → 4,600
  // ADS 8% × 300,000 = 24,000 → 28,600 total
  const r = calculateStampDuty({ propertyPrice: 300000, country: 'scotland', buyerStatus: 'additional' });
  assert.equal(r.surcharge, 0.08);
  assert.equal(r.total, 28600);
});

// ---------- Wales LTT ----------

test('Wales buyer £300k → LTT 6% × £75k above £225k = £4,500', () => {
  const r = calculateStampDuty({ propertyPrice: 300000, country: 'wales', buyerStatus: 'home_mover' });
  assert.equal(r.taxName, 'LTT');
  assert.equal(r.total, 4500);
});

test('Wales FTB has no relief (no FTB scheme in Wales)', () => {
  const r = calculateStampDuty({ propertyPrice: 300000, country: 'wales', buyerStatus: 'first_time' });
  assert.equal(r.ftbApplied, false);
  assert.equal(r.total, 4500);
});

test('Wales higher residential rate adds 5% on top', () => {
  // Base on £300k: 6% × 75k = 4,500
  // Surcharge 5% × 300,000 = 15,000 → 19,500
  const r = calculateStampDuty({ propertyPrice: 300000, country: 'wales', buyerStatus: 'additional' });
  assert.equal(r.surcharge, 0.05);
  assert.equal(r.total, 19500);
});

// ---------- Validation ----------

test('throws on non-positive price', () => {
  assert.throws(() => calculateStampDuty({ propertyPrice: 0, country: 'england_ni', buyerStatus: 'home_mover' }), /propertyPrice/);
});

test('throws on bad country', () => {
  assert.throws(() => calculateStampDuty({ propertyPrice: 300000, country: 'ireland', buyerStatus: 'home_mover' }), /country/);
});

test('throws on bad buyer status', () => {
  assert.throws(() => calculateStampDuty({ propertyPrice: 300000, country: 'england_ni', buyerStatus: 'investor' }), /buyerStatus/);
});

// ---------- Whole move cost ----------

test('move cost: standard £400k home mover, no selling, no mortgage, no survey, 3-bed short distance', () => {
  const r = calculateMoveCost({
    propertyPrice: 400000,
    country: 'england_ni',
    buyerStatus: 'home_mover',
    mortgage: 0,
    surveyType: 'none',
    houseSize: '3-bed',
    distance: 'short',
    selling: false,
  });
  // SDLT on £400k: 2,500 + 5% × 150k = 7,500 + 2,500 = 10,000
  // Conveyancing buy mid: 1,175
  // Removals 3-bed short mid: 900
  // Contingency: 250
  // Mid total: 10,000 + 1,175 + 900 + 250 = 12,325
  assert.equal(r.totals.mid, 12325);
  assert.equal(r.stampDuty.total, 10000);
  // No estate agent or EPC because not selling
  const keys = r.items.map((i) => i.key);
  assert.ok(!keys.includes('estate_agent'));
  assert.ok(!keys.includes('epc'));
  assert.ok(!keys.includes('mortgage_arrangement'));
  assert.ok(!keys.includes('survey'));
});

test('move cost: selling toggle adds estate agent and EPC, removes them when off', () => {
  const base = {
    propertyPrice: 400000,
    country: 'england_ni',
    buyerStatus: 'home_mover',
    mortgage: 200000,
    surveyType: 'level2',
    houseSize: '3-bed',
    distance: 'short',
  };

  const selling = calculateMoveCost(Object.assign({}, base, { selling: true, salePrice: 380000, agentFeePct: 1.2 }));
  const notSelling = calculateMoveCost(Object.assign({}, base, { selling: false }));

  const sellKeys = selling.items.map((i) => i.key);
  assert.ok(sellKeys.includes('estate_agent'));
  assert.ok(sellKeys.includes('epc'));
  assert.ok(sellKeys.includes('conveyancing_sell'));

  const noSellKeys = notSelling.items.map((i) => i.key);
  assert.ok(!noSellKeys.includes('estate_agent'));
  assert.ok(!noSellKeys.includes('epc'));
  assert.ok(!noSellKeys.includes('conveyancing_sell'));

  // Estate agent fee = 1.2% × 380,000 = 4,560
  const ea = selling.items.find((i) => i.key === 'estate_agent');
  assert.equal(ea.mid, 4560);
});

test('move cost: mortgage > 0 adds arrangement and valuation lines', () => {
  const r = calculateMoveCost({
    propertyPrice: 400000,
    country: 'england_ni',
    buyerStatus: 'home_mover',
    mortgage: 250000,
    surveyType: 'none',
    houseSize: '3-bed',
    distance: 'short',
    selling: false,
  });
  const keys = r.items.map((i) => i.key);
  assert.ok(keys.includes('mortgage_arrangement'));
  assert.ok(keys.includes('mortgage_valuation'));
});

test('move cost: low <= mid <= high totals always', () => {
  const r = calculateMoveCost({
    propertyPrice: 600000,
    country: 'england_ni',
    buyerStatus: 'home_mover',
    mortgage: 400000,
    surveyType: 'level3',
    houseSize: '4-bed',
    distance: 'long',
    selling: true,
    salePrice: 500000,
    agentFeePct: 1.5,
  });
  assert.ok(r.totals.low <= r.totals.mid);
  assert.ok(r.totals.mid <= r.totals.high);
});

test('move cost: contingency is always £250 and always present', () => {
  const r = calculateMoveCost({
    propertyPrice: 290000,
    country: 'england_ni',
    buyerStatus: 'first_time',
    mortgage: 0,
    surveyType: 'none',
    houseSize: '2-bed',
    distance: 'short',
    selling: false,
  });
  const c = r.items.find((i) => i.key === 'contingency');
  assert.ok(c);
  assert.equal(c.mid, CONTINGENCY);
});

test('move cost: items contain conveyancing_buy with the published range', () => {
  const r = calculateMoveCost({
    propertyPrice: 290000,
    country: 'england_ni',
    buyerStatus: 'first_time',
    mortgage: 0,
    surveyType: 'none',
    houseSize: '2-bed',
    distance: 'short',
    selling: false,
  });
  const cb = r.items.find((i) => i.key === 'conveyancing_buy');
  assert.equal(cb.low, CONVEYANCING_BUY.low);
  assert.equal(cb.high, CONVEYANCING_BUY.high);
});

test('move cost: throws on bad survey type', () => {
  assert.throws(() => calculateMoveCost({
    propertyPrice: 300000, country: 'england_ni', buyerStatus: 'home_mover',
    surveyType: 'level7', houseSize: '3-bed', distance: 'short', selling: false,
  }), /surveyType/);
});

test('move cost: EPC range matches published 60–120', () => {
  const r = calculateMoveCost({
    propertyPrice: 300000, country: 'england_ni', buyerStatus: 'home_mover',
    surveyType: 'none', houseSize: '3-bed', distance: 'short', selling: true, salePrice: 300000,
  });
  const epc = r.items.find((i) => i.key === 'epc');
  assert.equal(epc.low, EPC_RANGE.low);
  assert.equal(epc.high, EPC_RANGE.high);
});
