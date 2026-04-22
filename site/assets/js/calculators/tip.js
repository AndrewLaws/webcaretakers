'use strict';

/**
 * Tip / bill split calculator.
 *
 * Inputs:
 *   billTotal   : number  — the bill before tip (required, >= 0)
 *   tipPercent  : number  — tip percentage (default 18)
 *   splitBetween: integer — how many people are splitting (default 1)
 *   roundUp     : boolean — round each person's share up to the next whole unit
 *
 * Outputs:
 *   tipAmount, totalWithTip, perPersonBase, perPersonTotal
 *   (all rounded to 2 dp unless roundUp is true, in which case perPersonTotal
 *   rounds up to the nearest whole currency unit and tipAmount is adjusted
 *   upward to match, so the numbers still add up).
 */

function calculateTip(opts) {
  opts = opts || {};
  var bill   = Number(opts.billTotal);
  var pct    = opts.tipPercent == null ? 18 : Number(opts.tipPercent);
  var split  = opts.splitBetween == null ? 1 : Math.round(Number(opts.splitBetween));
  var roundUp = !!opts.roundUp;

  if (!isFinite(bill) || bill < 0) throw new Error('Bill total must be zero or a positive number');
  if (!isFinite(pct)  || pct < 0)  throw new Error('Tip percentage must be zero or positive');
  if (!isFinite(split) || split < 1) throw new Error('Split between must be at least 1');

  var tipAmount    = bill * (pct / 100);
  var totalWithTip = bill + tipAmount;
  var perPersonBase  = bill / split;
  var perPersonTotal = totalWithTip / split;

  if (roundUp) {
    // Round each person's total up to the nearest whole unit, then recompute
    // the grand total and tip so everything reconciles.
    perPersonTotal = Math.ceil(perPersonTotal);
    totalWithTip   = perPersonTotal * split;
    tipAmount      = totalWithTip - bill;
    perPersonBase  = bill / split;
  }

  return {
    billTotal:       round2(bill),
    tipPercent:      round2(pct),
    splitBetween:    split,
    tipAmount:       round2(tipAmount),
    totalWithTip:    round2(totalWithTip),
    perPersonBase:   round2(perPersonBase),
    perPersonTotal:  round2(perPersonTotal),
    roundUp:         roundUp,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateTip };
} else {
  window.TipCalc = { calculateTip };
}
