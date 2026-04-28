'use strict';

var test = require('node:test');
var assert = require('node:assert');
var S = require('./serp-ctr-estimator');

test('AWR curve: P1 with 100,000 volume returns roughly 40,000 expected clicks', function () {
  var r = S.estimate({ volume: 100000, position: 1, curve: 'awr' });
  // AWR P1 = 39.8% so expected ~ 39,800. Allow tight tolerance.
  assert.ok(r.expected > 39000 && r.expected < 41000,
    'expected ~39,800 clicks, got ' + r.expected);
  assert.strictEqual(r.ctrPercent, 39.8);
  assert.ok(r.low < r.expected && r.high > r.expected);
});

test('Position out of range is flagged invalid', function () {
  var r1 = S.estimate({ volume: 1000, position: 0, curve: 'awr' });
  assert.strictEqual(r1.valid, false);
  var r2 = S.estimate({ volume: 1000, position: 21, curve: 'awr' });
  assert.strictEqual(r2.valid, false);
  var r3 = S.estimate({ volume: 1000, position: 'banana', curve: 'awr' });
  assert.strictEqual(r3.valid, false);
});

test('Negative or zero volume is flagged invalid', function () {
  var r1 = S.estimate({ volume: -100, position: 3, curve: 'awr' });
  assert.strictEqual(r1.valid, false);
  var r2 = S.estimate({ volume: 0, position: 3, curve: 'awr' });
  assert.strictEqual(r2.valid, false);
});

test('SERP feature erosion stacks multiplicatively', function () {
  // Two erosions of 30% each should compound to 0.7 * 0.7 = 0.49 of base.
  var base = S.estimate({ volume: 10000, position: 1, curve: 'awr' });
  var eroded = S.estimate({
    volume: 10000,
    position: 1,
    curve: 'awr',
    features: { featuredSnippet: true, peopleAlsoAsk: true },
    erosions: { featuredSnippet: 0.3, peopleAlsoAsk: 0.3 }
  });
  var ratio = eroded.expected / base.expected;
  assert.ok(Math.abs(ratio - 0.49) < 0.001,
    'expected ratio ~0.49 (0.7*0.7), got ' + ratio);
  assert.strictEqual(eroded.erosionMultiplier.toFixed(4), '0.4900');
});

test('Branded multiplier of 1.5 increases expected clicks by 50%', function () {
  var base = S.estimate({ volume: 10000, position: 1, curve: 'awr' });
  var branded = S.estimate({
    volume: 10000,
    position: 1,
    curve: 'awr',
    branded: true,
    brandedMultiplier: 1.5
  });
  var ratio = branded.expected / base.expected;
  assert.ok(Math.abs(ratio - 1.5) < 0.001, 'expected 1.5x, got ' + ratio);
});

test('Comparison table: 10 rows, position 1..10, descending CTR', function () {
  var rows = S.comparisonTable({ volume: 10000, curve: 'awr' });
  assert.strictEqual(rows.length, 10);
  for (var i = 0; i < rows.length; i++) {
    assert.strictEqual(rows[i].position, i + 1);
    assert.ok(typeof rows[i].ctrPercent === 'number');
    assert.ok(typeof rows[i].expected === 'number');
  }
  for (var j = 1; j < rows.length; j++) {
    assert.ok(rows[j].ctrPercent <= rows[j - 1].ctrPercent,
      'CTR should not increase as position falls');
  }
});

test('Backlinko curve produces a different P1 CTR to AWR', function () {
  var awr = S.estimate({ volume: 10000, position: 1, curve: 'awr' });
  var bl  = S.estimate({ volume: 10000, position: 1, curve: 'backlinko' });
  assert.notStrictEqual(awr.ctrPercent, bl.ctrPercent);
});

test('Low/high band is +/- 25% of expected', function () {
  var r = S.estimate({ volume: 10000, position: 5, curve: 'awr' });
  assert.strictEqual(Math.round(r.low),  Math.round(r.expected * 0.75));
  assert.strictEqual(Math.round(r.high), Math.round(r.expected * 1.25));
});

test('Positions 11..20 follow a declining curve below P10', function () {
  var p10 = S.ctrFor(10, 'awr');
  var p20 = S.ctrFor(20, 'awr');
  assert.ok(p20 < p10);
  assert.ok(p20 >= 0.4 && p20 <= 0.6,
    'P20 should be near 0.5%, got ' + p20);
});
