'use strict';

var VALID_RATES = [0, 5, 20];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calculateVAT(opts) {
  if (!opts || typeof opts !== 'object') throw new Error('opts is required');

  var amount    = Number(opts.amount);
  var rate      = Number(opts.rate);
  var direction = opts.direction;

  if (!isFinite(amount) || amount < 0) {
    throw new Error('amount must be a non-negative number');
  }
  if (VALID_RATES.indexOf(rate) === -1) {
    throw new Error('rate must be 0, 5, or 20');
  }
  if (direction !== 'add' && direction !== 'remove') {
    throw new Error('direction must be "add" or "remove"');
  }

  var multiplier = 1 + rate / 100;
  var net, vat, gross;

  if (direction === 'add') {
    net   = round2(amount);
    gross = round2(amount * multiplier);
    vat   = round2(gross - net);
  } else {
    gross = round2(amount);
    net   = round2(amount / multiplier);
    vat   = round2(gross - net);
  }

  var rateName = rate === 20 ? 'Standard rate (20%)'
               : rate ===  5 ? 'Reduced rate (5%)'
               :               'Zero rate (0%)';

  return { net: net, vat: vat, gross: gross, rate: rate, direction: direction, rateName: rateName };
}

if (typeof module !== 'undefined') module.exports = { calculateVAT };
if (typeof window !== 'undefined') window.UKVat = { calculateVAT };
