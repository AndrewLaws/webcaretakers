'use strict';

/**
 * Fuel Economy Converter: pure logic library.
 *
 * Four units, anchored on L/100km internally to avoid drift:
 *   mpgUk   miles per imperial gallon (UK)
 *   mpgUs   miles per US gallon (US, Canada)
 *   l100km  litres per 100 kilometres (Europe, Australia)
 *   kml     kilometres per litre (parts of Asia, South America)
 *
 * Derived constants:
 *   1 imperial gallon = 4.54609 L
 *   1 US gallon       = 3.785411784 L
 *   1 mile            = 1.609344 km
 *
 *   MPG-UK to L/100km : (4.54609 * 100) / 1.609344     = 282.4809363...
 *   MPG-US to L/100km : (3.785411784 * 100) / 1.609344 = 235.2145833...
 *
 * The MPG <-> L/100km mapping is reciprocal: x mpg = K / x in L/100km, and
 * vice versa, so the same constant works both ways.
 */

var IMP_GAL_LITRES = 4.54609;
var US_GAL_LITRES = 3.785411784;
var MILE_KM = 1.609344;

var K_MPG_UK = (IMP_GAL_LITRES * 100) / MILE_KM; // ~282.4809
var K_MPG_US = (US_GAL_LITRES * 100) / MILE_KM;  // ~235.2146

function isUsable(x) {
  return typeof x === 'number' && isFinite(x) && x > 0;
}

function mpgUkToL100km(v) { return K_MPG_UK / v; }
function l100kmToMpgUk(v) { return K_MPG_UK / v; }
function mpgUsToL100km(v) { return K_MPG_US / v; }
function l100kmToMpgUs(v) { return K_MPG_US / v; }
function kmlToL100km(v)   { return 100 / v; }
function l100kmToKml(v)   { return 100 / v; }

var BLANK = { mpgUk: null, mpgUs: null, l100km: null, kml: null };

/**
 * Given a "source of truth" field and its raw value, return all four values.
 * Returns nulls across the board for zero, negative, non-finite, or empty input.
 *
 * The point of routing every conversion through L/100km is to make round-tripping
 * stable and the maths auditable in one place.
 */
function computeFromField(field, value) {
  if (value === '' || value === null || value === undefined) return Object.assign({}, BLANK);
  var n = typeof value === 'number' ? value : parseFloat(value);
  if (!isUsable(n)) return Object.assign({}, BLANK);

  var l100;
  switch (field) {
    case 'mpgUk':  l100 = mpgUkToL100km(n); break;
    case 'mpgUs':  l100 = mpgUsToL100km(n); break;
    case 'l100km': l100 = n; break;
    case 'kml':    l100 = kmlToL100km(n); break;
    default: return Object.assign({}, BLANK);
  }
  if (!isUsable(l100)) return Object.assign({}, BLANK);

  return {
    mpgUk:  field === 'mpgUk'  ? n : l100kmToMpgUk(l100),
    mpgUs:  field === 'mpgUs'  ? n : l100kmToMpgUs(l100),
    l100km: field === 'l100km' ? n : l100,
    kml:    field === 'kml'    ? n : l100kmToKml(l100)
  };
}

function round(n, dp) {
  if (n === null || n === undefined || !isFinite(n)) return null;
  var f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
function roundMpg(n)  { return round(n, 1); }
function roundL100(n) { return round(n, 2); }
function roundKml(n)  { return round(n, 2); }

var api = {
  IMP_GAL_LITRES: IMP_GAL_LITRES,
  US_GAL_LITRES: US_GAL_LITRES,
  MILE_KM: MILE_KM,
  K_MPG_UK: K_MPG_UK,
  K_MPG_US: K_MPG_US,
  mpgUkToL100km: mpgUkToL100km,
  l100kmToMpgUk: l100kmToMpgUk,
  mpgUsToL100km: mpgUsToL100km,
  l100kmToMpgUs: l100kmToMpgUs,
  kmlToL100km: kmlToL100km,
  l100kmToKml: l100kmToKml,
  computeFromField: computeFromField,
  roundMpg: roundMpg,
  roundL100: roundL100,
  roundKml: roundKml
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.FuelEconomyConverter = api;
}
