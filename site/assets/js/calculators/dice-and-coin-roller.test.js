'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('./dice-and-coin-roller.js');

// ---------- Notation parser ----------

test('parseDiceNotation: "d6" defaults to 1d6', () => {
  const r = lib.parseDiceNotation('d6');
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.equal(r.sides, 6);
  assert.equal(r.modifier, 0);
  assert.equal(r.keep, null);
});

test('parseDiceNotation: "3d8" parses as 3 dice with 8 sides', () => {
  const r = lib.parseDiceNotation('3d8');
  assert.equal(r.ok, true);
  assert.equal(r.count, 3);
  assert.equal(r.sides, 8);
  assert.equal(r.modifier, 0);
});

test('parseDiceNotation: "1d20+5" handles positive modifier', () => {
  const r = lib.parseDiceNotation('1d20+5');
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  assert.equal(r.sides, 20);
  assert.equal(r.modifier, 5);
});

test('parseDiceNotation: "2d6-3" handles negative modifier', () => {
  const r = lib.parseDiceNotation('2d6-3');
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  assert.equal(r.sides, 6);
  assert.equal(r.modifier, -3);
});

test('parseDiceNotation: "4d6kh3" parses keep-highest', () => {
  const r = lib.parseDiceNotation('4d6kh3');
  assert.equal(r.ok, true);
  assert.equal(r.count, 4);
  assert.equal(r.sides, 6);
  assert.deepEqual(r.keep, { type: 'h', n: 3 });
});

test('parseDiceNotation: "4d6kl1" parses keep-lowest', () => {
  const r = lib.parseDiceNotation('4d6kl1');
  assert.equal(r.ok, true);
  assert.deepEqual(r.keep, { type: 'l', n: 1 });
});

test('parseDiceNotation: handles whitespace and capitals', () => {
  const r = lib.parseDiceNotation('  2D6+1  ');
  assert.equal(r.ok, true);
  assert.equal(r.count, 2);
  assert.equal(r.sides, 6);
  assert.equal(r.modifier, 1);
});

test('parseDiceNotation: rejects empty input', () => {
  const r = lib.parseDiceNotation('');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects gibberish', () => {
  const r = lib.parseDiceNotation('hello');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects sides below 2', () => {
  const r = lib.parseDiceNotation('1d1');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects sides above 1000', () => {
  const r = lib.parseDiceNotation('1d1001');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects count above 100', () => {
  const r = lib.parseDiceNotation('101d6');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects count below 1', () => {
  const r = lib.parseDiceNotation('0d6');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects keep count larger than dice count', () => {
  const r = lib.parseDiceNotation('3d6kh4');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: rejects keep count of 0', () => {
  const r = lib.parseDiceNotation('3d6kh0');
  assert.equal(r.ok, false);
});

test('parseDiceNotation: modifier of 0 is fine when written as +0', () => {
  const r = lib.parseDiceNotation('1d20+0');
  assert.equal(r.ok, true);
  assert.equal(r.modifier, 0);
});

// ---------- Roll engine (with injectable randomInt) ----------

test('rollDice: returns each individual roll plus the sum and modifier', () => {
  // Stub randomInt to return a sequence: returns 0, 1, 2... so face = idx+1.
  let i = 0;
  const stub = (n) => (i++ % n);
  const out = lib.rollDice({ count: 3, sides: 6, modifier: 0, keep: null }, stub);
  assert.equal(out.rolls.length, 3);
  // rolls[0]=1, rolls[1]=2, rolls[2]=3
  assert.deepEqual(out.rolls, [1, 2, 3]);
  assert.deepEqual(out.kept, [1, 2, 3]);
  assert.equal(out.modifier, 0);
  assert.equal(out.total, 6);
});

test('rollDice: applies modifier to the final total', () => {
  const stub = () => 4; // every roll is a 5 on a d6
  const out = lib.rollDice({ count: 2, sides: 6, modifier: 3, keep: null }, stub);
  assert.deepEqual(out.rolls, [5, 5]);
  assert.equal(out.total, 13);
});

test('rollDice: keep highest 3 of 4 picks the top three', () => {
  // Force rolls 1,2,3,4 in that order via a queue stub.
  const queue = [0, 1, 2, 3];
  const stub = () => queue.shift();
  const out = lib.rollDice({ count: 4, sides: 6, modifier: 0, keep: { type: 'h', n: 3 } }, stub);
  assert.deepEqual(out.rolls, [1, 2, 3, 4]);
  assert.deepEqual(out.kept.slice().sort(), [2, 3, 4]);
  assert.equal(out.total, 9);
});

test('rollDice: keep lowest 1 of 4 picks the smallest', () => {
  const queue = [3, 0, 5, 2];
  const stub = () => queue.shift();
  const out = lib.rollDice({ count: 4, sides: 6, modifier: 0, keep: { type: 'l', n: 1 } }, stub);
  assert.deepEqual(out.rolls, [4, 1, 6, 3]);
  assert.deepEqual(out.kept, [1]);
  assert.equal(out.total, 1);
});

// ---------- Coin flip ----------

test('flipCoins: returns the requested count of H/T tokens', () => {
  let i = 0;
  const stub = () => (i++ % 2);
  const out = lib.flipCoins(10, stub);
  assert.equal(out.flips.length, 10);
  out.flips.forEach((f) => assert.ok(f === 'H' || f === 'T'));
  assert.equal(out.heads + out.tails, 10);
});

test('flipCoins: rejects below 1', () => {
  assert.throws(() => lib.flipCoins(0));
});

test('flipCoins: rejects above 1000', () => {
  assert.throws(() => lib.flipCoins(1001));
});

// ---------- Bias checks (real RNG) ----------

test('bias: 10000 d6 rolls land within 15% of the expected 1667 per face', () => {
  const counts = [0, 0, 0, 0, 0, 0];
  const trials = 10000;
  for (let i = 0; i < trials; i++) {
    const r = lib.rollDice({ count: 1, sides: 6, modifier: 0, keep: null });
    counts[r.rolls[0] - 1]++;
  }
  const expected = trials / 6;
  const lower = expected * 0.85;
  const upper = expected * 1.15;
  for (let f = 0; f < 6; f++) {
    assert.ok(
      counts[f] >= lower && counts[f] <= upper,
      `face ${f + 1}: got ${counts[f]}, expected within [${lower.toFixed(0)}, ${upper.toFixed(0)}]`
    );
  }
});

test('bias: 10000 coin flips land within 5% of the expected 5000 each side', () => {
  const out = lib.flipCoins(1000); // start small to check shape
  assert.equal(out.flips.length, 1000);
  // Now run the real bias test in chunks to stay under the 1000 cap.
  let heads = 0;
  let tails = 0;
  for (let chunk = 0; chunk < 10; chunk++) {
    const r = lib.flipCoins(1000);
    heads += r.heads;
    tails += r.tails;
  }
  const expected = 5000;
  const lower = expected * 0.95;
  const upper = expected * 1.05;
  assert.ok(heads >= lower && heads <= upper, `heads: ${heads}`);
  assert.ok(tails >= lower && tails <= upper, `tails: ${tails}`);
});

test('defaultRandomInt: stays in [0, n)', () => {
  for (let i = 0; i < 200; i++) {
    const v = lib.defaultRandomInt(20);
    assert.ok(v >= 0 && v < 20 && Number.isInteger(v));
  }
});

// ---------- History ----------

test('formatRoll: produces a human-readable string for dice mode', () => {
  const s = lib.formatRoll({
    mode: 'dice',
    notation: '2d6+1',
    rolls: [3, 5],
    kept: [3, 5],
    modifier: 1,
    total: 9
  });
  assert.match(s, /2d6\+1/);
  assert.match(s, /9/);
});

test('formatRoll: produces a human-readable string for coin mode', () => {
  const s = lib.formatRoll({
    mode: 'coin',
    count: 5,
    heads: 2,
    tails: 3,
    flips: ['H', 'T', 'T', 'H', 'T']
  });
  assert.match(s, /5/);
  assert.match(s, /heads/i);
});
