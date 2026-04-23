'use strict';

/**
 * Unit Converter.
 *
 * Converts between common units in: length, mass, volume, temperature,
 * speed, area. All conversions go via a canonical base unit per category.
 * Temperature is handled specially because the offset (32°F) breaks the
 * simple multiplicative model.
 */

var CATEGORIES = {
  length: {
    base: 'metre',
    units: {
      'millimetre':  { label: 'Millimetre (mm)', factor: 0.001 },
      'centimetre':  { label: 'Centimetre (cm)', factor: 0.01 },
      'metre':       { label: 'Metre (m)',       factor: 1 },
      'kilometre':   { label: 'Kilometre (km)',  factor: 1000 },
      'inch':        { label: 'Inch (in)',       factor: 0.0254 },
      'foot':        { label: 'Foot (ft)',       factor: 0.3048 },
      'yard':        { label: 'Yard (yd)',       factor: 0.9144 },
      'mile':        { label: 'Mile (mi)',       factor: 1609.344 },
    },
  },
  mass: {
    base: 'kilogram',
    units: {
      'milligram':   { label: 'Milligram (mg)', factor: 0.000001 },
      'gram':        { label: 'Gram (g)',       factor: 0.001 },
      'kilogram':    { label: 'Kilogram (kg)',  factor: 1 },
      'tonne':       { label: 'Tonne (t)',      factor: 1000 },
      'ounce':       { label: 'Ounce (oz)',     factor: 0.028349523125 },
      'pound':       { label: 'Pound (lb)',     factor: 0.45359237 },
      'stone':       { label: 'Stone (st)',     factor: 6.35029318 },
    },
  },
  volume: {
    base: 'litre',
    units: {
      'millilitre':  { label: 'Millilitre (ml)',           factor: 0.001 },
      'litre':       { label: 'Litre (l)',                 factor: 1 },
      'teaspoon-us': { label: 'US teaspoon',               factor: 0.00492892 },
      'tablespoon-us':{label: 'US tablespoon',             factor: 0.01478676 },
      'cup-us':      { label: 'US cup',                    factor: 0.2365882365 },
      'pint-us':     { label: 'US pint (liquid)',          factor: 0.473176473 },
      'quart-us':    { label: 'US quart (liquid)',         factor: 0.946352946 },
      'gallon-us':   { label: 'US gallon (liquid)',        factor: 3.785411784 },
      'pint-uk':     { label: 'UK pint',                   factor: 0.56826125 },
      'gallon-uk':   { label: 'UK gallon',                 factor: 4.54609 },
      'fluid-ounce-us': { label: 'US fluid ounce (fl oz)', factor: 0.0295735295625 },
      'fluid-ounce-uk': { label: 'UK fluid ounce (fl oz)', factor: 0.0284130625 },
    },
  },
  speed: {
    base: 'metre-per-second',
    units: {
      'metre-per-second':     { label: 'm/s',   factor: 1 },
      'kilometre-per-hour':   { label: 'km/h',  factor: 1 / 3.6 },
      'mile-per-hour':        { label: 'mph',   factor: 0.44704 },
      'knot':                 { label: 'Knot',  factor: 0.514444 },
      'foot-per-second':      { label: 'ft/s',  factor: 0.3048 },
    },
  },
  area: {
    base: 'square-metre',
    units: {
      'square-centimetre': { label: 'cm²',    factor: 0.0001 },
      'square-metre':      { label: 'm²',     factor: 1 },
      'hectare':           { label: 'Hectare (ha)', factor: 10000 },
      'square-kilometre':  { label: 'km²',    factor: 1000000 },
      'square-inch':       { label: 'in²',    factor: 0.00064516 },
      'square-foot':       { label: 'ft²',    factor: 0.09290304 },
      'square-yard':       { label: 'yd²',    factor: 0.83612736 },
      'acre':              { label: 'Acre',   factor: 4046.8564224 },
      'square-mile':       { label: 'mi²',    factor: 2589988.110336 },
    },
  },
  temperature: {
    base: 'celsius',
    units: {
      'celsius':    { label: 'Celsius (°C)'    },
      'fahrenheit': { label: 'Fahrenheit (°F)' },
      'kelvin':     { label: 'Kelvin (K)'      },
    },
  },
};

function toCelsius(value, unit) {
  if (unit === 'celsius')    return value;
  if (unit === 'fahrenheit') return (value - 32) * 5 / 9;
  if (unit === 'kelvin')     return value - 273.15;
  throw new Error('Unknown temperature unit: ' + unit);
}

function fromCelsius(celsius, unit) {
  if (unit === 'celsius')    return celsius;
  if (unit === 'fahrenheit') return celsius * 9 / 5 + 32;
  if (unit === 'kelvin')     return celsius + 273.15;
  throw new Error('Unknown temperature unit: ' + unit);
}

function convert(opts) {
  opts = opts || {};
  var category = opts.category;
  var from     = opts.from;
  var to       = opts.to;
  var value    = Number(opts.value);

  if (!CATEGORIES.hasOwnProperty(category)) {
    throw new Error('Unknown category: ' + category);
  }
  if (!isFinite(value)) throw new Error('Value must be a finite number');

  var cat = CATEGORIES[category];
  if (!cat.units.hasOwnProperty(from)) throw new Error('Unknown unit: ' + from);
  if (!cat.units.hasOwnProperty(to))   throw new Error('Unknown unit: ' + to);

  if (category === 'temperature') {
    var c = toCelsius(value, from);
    return fromCelsius(c, to);
  }

  var baseValue = value * cat.units[from].factor;
  return baseValue / cat.units[to].factor;
}

function listUnits(category) {
  if (!CATEGORIES.hasOwnProperty(category)) throw new Error('Unknown category: ' + category);
  var out = [];
  var units = CATEGORIES[category].units;
  for (var k in units) if (Object.prototype.hasOwnProperty.call(units, k)) {
    out.push({ key: k, label: units[k].label });
  }
  return out;
}

function listCategories() {
  var out = [];
  for (var k in CATEGORIES) if (Object.prototype.hasOwnProperty.call(CATEGORIES, k)) {
    out.push(k);
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { convert, listUnits, listCategories, CATEGORIES };
} else {
  window.UnitConverter = { convert, listUnits, listCategories, CATEGORIES };
}
